use anchor_lang::prelude::*;
pub mod errors;
pub mod instructions;
pub mod states;
pub use errors::*;
pub use instructions::*;
pub use states::*;

declare_id!("BjNZT8vQYjswh1uTLWY8mrb4qZVCpMJSH1vBPpFabXum");

#[program]
pub mod vault {
    use super::*;

    pub fn initialize(ctx: Context<InitalizeVault>, target: u64) -> Result<()> {
        let vault_state_bump = &ctx.bumps.vault_state;
        let mint_pubkey = &ctx.accounts.mint.key();
        ctx.accounts
            .initialize(target, *vault_state_bump, *mint_pubkey)
    }

    pub fn deposit(ctx: Context<VaultOperations>, amount: u64) -> Result<()> {
        ctx.accounts.deposit(amount)
    }

    pub fn withdraw(ctx: Context<VaultOperations>) -> Result<()> {
        ctx.accounts.withdraw()
    }
}
