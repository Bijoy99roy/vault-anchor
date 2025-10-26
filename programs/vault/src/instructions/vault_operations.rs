use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};
use create::{errors::VaultError, states::VaultState};

#[Accounts]
pub struct VaultOperations<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [b"vault_state", user.key().as_ref(), vault_state.token.as_ref()],
        bump = vault_state.vault_bump
    )]
    pub vault_state: Account<'info, VaultState>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = vault_state,
        associated_token::token_program = token_program
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = user,
        associated_token::token_program = token_program
    )]
    pub user_mint_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mint::token_program=token_program)]
    pub mint: InterfaceAccount<'info, Mint>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub token_program: Interface<'info, TokenInterface>,

    pub system_program: Program<'info, System>,
}

impl<'info> VaultOperations<'info> {
    pub fn deposit(&self, amount: u64) -> Result<()> {
        require(amount > 0, VaultError::InvalidTokenAmount);

        let cpi_program = self.token_program.to_account_info();
        let transfer_account = TransferChecked {
            from: self.user_mint_token_account.to_account_info(),
            to: self.vault.to_account_info(),
            mint: self.mint.to_account_info(),
            authority: self.user.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(cpi_program, transfer_account);
        transfer_checked(cpi_ctx, amount, self.mint.decimals)
    }

    pub fn withdraw(&self) -> Result<()> {}
}
