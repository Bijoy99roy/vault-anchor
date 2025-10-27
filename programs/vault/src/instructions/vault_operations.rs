use crate::{errors::VaultError, states::VaultState};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};

#[derive(Accounts)]
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
    fn transfer_tokens(
        &self,
        from: &AccountInfo<'info>,
        to: &AccountInfo<'info>,
        authority: &AccountInfo<'info>,
        signer_seeds: Option<&[&[&[u8]]]>,
        amount: u64,
    ) -> Result<()> {
        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = TransferChecked {
            from: from.clone(),
            to: to.clone(),
            mint: self.mint.to_account_info(),
            authority: authority.clone(),
        };

        let cpi_ctx = match signer_seeds {
            Some(seeds) => CpiContext::new_with_signer(cpi_program, cpi_accounts, seeds),
            None => CpiContext::new(cpi_program, cpi_accounts),
        };

        transfer_checked(cpi_ctx, amount, self.mint.decimals)
    }

    pub fn deposit(&self, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::InvalidTokenAmount);

        self.transfer_tokens(
            &self.user_mint_token_account.to_account_info(),
            &self.vault.to_account_info(),
            &self.user.to_account_info(),
            None,
            amount,
        )?;

        if self.vault.amount >= self.vault_state.target {
            let user_wallet_address = self.user.key();
            let user_mint_token_account_address = self.user_mint_token_account.key();
            let seeds = &[
                b"vault_state",
                user_wallet_address.as_ref(),
                user_mint_token_account_address.as_ref(),
                &[self.vault_state.vault_bump],
            ];
            let signer_seeds = &[&seeds[..]];

            self.transfer_tokens(
                &self.vault.to_account_info(),
                &self.user_mint_token_account.to_account_info(),
                &self.vault_state.to_account_info(),
                Some(signer_seeds),
                self.vault.amount,
            )?;
        }
        Ok(())
    }

    pub fn withdraw(&self) -> Result<()> {
        require!(
            self.vault_state.target >= self.vault.amount,
            VaultError::SavingGoalNotReached,
        );

        let user_wallet_address = self.user.key();
        let user_mint_token_account_address = self.user_mint_token_account.key();
        let seeds = &[
            b"vault_state",
            user_wallet_address.as_ref(),
            user_mint_token_account_address.as_ref(),
            &[self.vault_state.vault_bump],
        ];

        let signer_seeds = &[&seeds[..]];

        self.transfer_tokens(
            &self.vault.to_account_info(),
            &self.user_mint_token_account.to_account_info(),
            &self.vault_state.to_account_info(),
            Some(signer_seeds),
            self.vault.amount,
        )
    }
}
