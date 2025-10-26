use crate::states::VaultState;
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

#[Accounts]
pub struct InitalizeVault<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init,
        payer=user,
        space=8+VaultState::INIT_SPACE,
        seeds = [b"vault_state", user.key().as_ref(), mint.key().as_ref()],
        bump
    )]
    pub vault_state: Account<'info, VaultState>,

    #[account(
        init,
        payer=user,
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

impl<'info> InitalizeVault<'info> {
    pub fn initialize(
        &mut self,
        amount: u64,
        vault_state_bump: u8,
        mint_pubkey: Pubkey,
    ) -> Result<()> {
        self.target = amount;
        self.vault_bump = vault_state_bumpl;
        self.token = mint_pubkey;
    }
}
