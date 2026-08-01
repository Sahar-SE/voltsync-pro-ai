class SafetyInterlock:
    @staticmethod
    def validate_toggle_sector(sector_id: str, new_status: bool) -> tuple[bool, str]:
        """
        Validates if toggling a sector is safe.
        Rule 1: Hospital status must always remain online (True).
        """
        if sector_id == "hospital" and not new_status:
            return False, "Rule Violation: Medical Complex D (Hospital) status must always remain active (online)."
        return True, ""

    @staticmethod
    def validate_voltage_adjustment(current_voltage: float, new_voltage: float) -> tuple[bool, str]:
        """
        Validates if voltage changes are within safe limits.
        Rule 2: Voltage adjustment steps cannot exceed 5% of nominal (11.0V step size).
        """
        nominal_voltage = 220.0
        max_step = nominal_voltage * 0.05  # 11.0V
        
        step_size = abs(new_voltage - current_voltage)
        if step_size > max_step:
            return False, f"Rule Violation: Voltage adjustment step size of {step_size:.1f}V exceeds 5% of nominal limit ({max_step:.1f}V)."
        return True, ""

    @staticmethod
    def validate_power_allocation(sector_id: str, priority: int, demand: float, allocated: float) -> tuple[bool, str]:
        """
        Validates if power allocation for a sector is safe.
        Rule 3: Power allocated to priority 1 sectors must be at least 95% of its current demand.
        """
        if priority == 1 and demand > 0:
            min_allocation = 0.95 * demand
            if allocated < min_allocation:
                return False, f"Rule Violation: Allocation for priority 1 sector '{sector_id}' is {allocated:.1f}MW, which is below the 95% minimum requirement ({min_allocation:.1f}MW)."
        return True, ""
