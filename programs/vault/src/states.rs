use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct VaultState {
    pub target: u64,
    pub token: Pubkey,
    pub vault_bump: u8,
}
