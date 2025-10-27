use anchor_lang::prelude::*;

#[error_code]
pub enum VaultError {
    #[msg("Token amount is invalid")]
    InvalidTokenAmount,
    #[msg("Saving goal has not met yet")]
    SavingGoalNotReached,
}
