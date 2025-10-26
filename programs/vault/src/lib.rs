use anchor_lang::prelude::*;
pub mod errors;
pub mod states;
pub use errors::*;
pub use states::*;

declare_id!("BjNZT8vQYjswh1uTLWY8mrb4qZVCpMJSH1vBPpFabXum");

#[program]
pub mod vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
