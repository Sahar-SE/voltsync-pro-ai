import os
import re
import requests
import math
from app.core.config import HUGGINGFACE_API_TOKEN

# Global in-memory index holding document chunks
# Structure: list of dicts: {"title": str, "content": str, "source_file": str, "embedding": list[float]}
RAG_INDEX = []

# Global TF-IDF fallback structures
TFIDF_VOCAB = {}  # {word: index}
TFIDF_IDF = []    # idf value for each word in vocab
TFIDF_VECTORS = [] # list of lists representing TF-IDF vector for each chunk

SOP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "infra", "sop_documents")

def initialize_rag():
    """
    Scans the SOP documents folder, chunks files, extracts embeddings using Hugging Face (or falls back),
    and initializes the in-memory semantic RAG index.
    """
    global RAG_INDEX
    RAG_INDEX.clear()
    
    if not os.path.exists(SOP_DIR):
        print(f"RAG: Directory {SOP_DIR} not found. Skipping document indexing.")
        return
        
    files = [f for f in os.listdir(SOP_DIR) if f.endswith((".md", ".txt"))]
    print(f"RAG: Found {len(files)} SOP manuals to index.")
    
    temp_chunks = []
    
    for filename in files:
        filepath = os.path.join(SOP_DIR, filename)
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
                
            # Extract document title
            title_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
            title = title_match.group(1) if title_match else filename
            
            # Chunking: split by double newlines (paragraphs) and handle newlines styles
            normalized_content = content.replace("\r\n", "\n")
            paragraphs = normalized_content.split("\n\n")
            for i, para in enumerate(paragraphs):
                lines = para.split("\n")
                # Filter out empty lines and header lines starting with '#'
                clean_lines = [line.strip() for line in lines if line.strip() and not line.strip().startswith("#")]
                if not clean_lines:
                    continue
                    
                clean_para = " ".join(clean_lines)
                # Clean markdown characters for search snippet
                display_text = clean_para.replace("`", "").replace("**", "")
                
                temp_chunks.append({
                    "title": title,
                    "content": display_text,
                    "source_file": filename,
                    "embedding": []
                })
        except Exception as e:
            print(f"RAG: Failed parsing {filename}: {e}")
            
    if not temp_chunks:
        print("RAG: No valid chunks found to index.")
        return

    # Try generating embeddings via Hugging Face
    success = False
    if HUGGINGFACE_API_TOKEN:
        try:
            print("RAG: Requesting Hugging Face Inference API embeddings...")
            texts = [c["content"] for c in temp_chunks]
            embeddings = fetch_hf_embeddings(texts)
            if embeddings and len(embeddings) == len(temp_chunks):
                for chunk, emb in zip(temp_chunks, embeddings):
                    chunk["embedding"] = emb
                success = True
                print(f"RAG: Successfully cached {len(temp_chunks)} chunks via Hugging Face.")
        except Exception as e:
            print(f"RAG: Hugging Face embedding generation failed: {e}")
            
    if not success:
        print("RAG: Initializing local TF-IDF vectorizer fallback...")
        build_tfidf_index(temp_chunks)
        
    RAG_INDEX.extend(temp_chunks)
    print("RAG: Initialization complete.")

def fetch_hf_embeddings(texts: list[str]) -> list[list[float]]:
    """
    Queries Hugging Face Feature Extraction API for embeddings.
    """
    model_id = "sentence-transformers/all-MiniLM-L6-v2"
    api_url = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{model_id}"
    headers = {"Authorization": f"Bearer {HUGGINGFACE_API_TOKEN}"}
    
    response = requests.post(api_url, headers=headers, json={"inputs": texts}, timeout=10)
    response.raise_for_status()
    return response.json()

def build_tfidf_index(chunks: list[dict]):
    """
    Builds a local TF-IDF text vocabulary and vectors for chunk fallback matches.
    """
    global TFIDF_VOCAB, TFIDF_IDF, TFIDF_VECTORS
    
    # 1. Clean tokenization
    def tokenize(text):
        return re.findall(r"\b\w{3,}\b", text.lower())
        
    # 2. Build vocabulary and term frequencies
    doc_tokens = [tokenize(c["content"]) for c in chunks]
    vocab = set()
    for tokens in doc_tokens:
        vocab.update(tokens)
        
    TFIDF_VOCAB = {word: idx for idx, word in enumerate(sorted(vocab))}
    vocab_size = len(TFIDF_VOCAB)
    num_docs = len(chunks)
    
    # 3. Calculate Document Frequency (DF)
    df = [0] * vocab_size
    for tokens in doc_tokens:
        unique_tokens = set(tokens)
        for t in unique_tokens:
            if t in TFIDF_VOCAB:
                df[TFIDF_VOCAB[t]] += 1
                
    # 4. Calculate IDF
    TFIDF_IDF = [math.log(1.0 + num_docs / (1.0 + count)) for count in df]
    
    # 5. Compute TF-IDF Vectors
    TFIDF_VECTORS = []
    for doc_idx, tokens in enumerate(doc_tokens):
        vector = [0.0] * vocab_size
        if not tokens:
            TFIDF_VECTORS.append(vector)
            continue
            
        tf = {}
        for t in tokens:
            tf[t] = tf.get(t, 0) + 1
            
        for term, count in tf.items():
            if term in TFIDF_VOCAB:
                term_idx = TFIDF_VOCAB[term]
                # Normalized term frequency
                tf_norm = count / len(tokens)
                vector[term_idx] = tf_norm * TFIDF_IDF[term_idx]
                
        # Normalize vector length (L2 norm)
        magnitude = math.sqrt(sum(v**2 for v in vector))
        if magnitude > 0:
            vector = [v / magnitude for v in vector]
            
        TFIDF_VECTORS.append(vector)

def search_rag(query: str, limit: int = 3) -> list[dict]:
    """
    Searches the RAG index using semantic cosine similarity (Hugging Face) or TF-IDF fallback.
    """
    if not RAG_INDEX:
        return []
        
    # Check if we have active Hugging Face vector embeddings
    use_hf = len(RAG_INDEX[0]["embedding"]) > 0
    
    if use_hf:
        try:
            # Fetch embedding for search query
            query_emb = fetch_hf_embeddings([query])[0]
            
            results = []
            for chunk in RAG_INDEX:
                sim = cosine_similarity(query_emb, chunk["embedding"])
                results.append({**chunk, "similarity_score": round(sim, 3)})
                
            # Sort by highest similarity
            results.sort(key=lambda x: x["similarity_score"], reverse=True)
            # Remove embedding array from user response payload to keep clean
            for r in results:
                r.pop("embedding", None)
            return results[:limit]
            
        except Exception as e:
            print(f"RAG: HF Query Search failed, running fallback search: {e}")
            
    # Fallback search using local TF-IDF
    return search_tfidf(query, limit)

def search_tfidf(query: str, limit: int = 3) -> list[dict]:
    """
    Computes TF-IDF cosine similarity search fallback.
    """
    def tokenize(text):
        return re.findall(r"\b\w{3,}\b", text.lower())
        
    tokens = tokenize(query)
    vocab_size = len(TFIDF_VOCAB)
    query_vector = [0.0] * vocab_size
    
    if not tokens or vocab_size == 0:
        # Fallback to general order if query yields no match tokens
        return [{"title": r["title"], "content": r["content"], "source_file": r["source_file"], "similarity_score": 0.0} for r in RAG_INDEX[:limit]]
        
    tf = {}
    for t in tokens:
        tf[t] = tf.get(t, 0) + 1
        
    for term, count in tf.items():
        if term in TFIDF_VOCAB:
            term_idx = TFIDF_VOCAB[term]
            query_vector[term_idx] = (count / len(tokens)) * TFIDF_IDF[term_idx]
            
    # L2 normalize query vector
    q_magnitude = math.sqrt(sum(v**2 for v in query_vector))
    if q_magnitude > 0:
        query_vector = [v / q_magnitude for v in query_vector]
        
    results = []
    for doc_idx, doc_vector in enumerate(TFIDF_VECTORS):
        # Cosine similarity for unit vectors is simply their dot product
        sim = sum(q * d for q, d in zip(query_vector, doc_vector))
        chunk = RAG_INDEX[doc_idx]
        results.append({
            "title": chunk["title"],
            "content": chunk["content"],
            "source_file": chunk["source_file"],
            "similarity_score": round(sim, 3)
        })
        
    results.sort(key=lambda x: x["similarity_score"], reverse=True)
    return results[:limit]

def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    dot_product = sum(a * b for a, b in zip(v1, v2))
    norm_a = math.sqrt(sum(a**2 for a in v1))
    norm_b = math.sqrt(sum(b**2 for b in v2))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (norm_a * norm_b)
