import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Vault } from "../target/types/vault";
import { createMint, createAssociatedTokenAccount, mintTo, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, getAccount } from "@solana/spl-token";
import { assert } from "chai";

describe("vault", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.vault as Program<Vault>;

  const provider = anchor.getProvider();

  const user = anchor.web3.Keypair.generate();

  let mint: anchor.web3.PublicKey;
  let vaultStatePda: anchor.web3.PublicKey;
  let vaultAta: anchor.web3.PublicKey;
  let userAta: anchor.web3.PublicKey;


  async function getPda(seeds) {
    const [pda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      seeds,
      program.programId
    );

    return {pda, bump}
  }

  async function mintToken(user: anchor.web3.Keypair){
    const mint = await createMint(
    provider.connection,
    user,
    user.publicKey, 
    null,           
    6               
  );

  const userAta = await createAssociatedTokenAccount(
    provider.connection,
    user,
    mint,
    user.publicKey
  );


  await mintTo( 
    provider.connection,
    user,
    mint,
    userAta,
    user,
    1_000_000_000
  );

  return { mint, userAta };
  }


  async function getAirdrop(
    publicKey: anchor.web3.PublicKey,
    amount: number = 100 * anchor.web3.LAMPORTS_PER_SOL
  ){
    const airdropTxn = await provider.connection.requestAirdrop(
      publicKey,
      amount
    );

    await provider.connection.confirmTransaction(airdropTxn);
  }

  before(async ()=>{
    await getAirdrop(user.publicKey);
    const tokenMint = await mintToken(user)

    mint = tokenMint.mint
    userAta = tokenMint.userAta

    const {pda} = await getPda([Buffer.from("vault_state"), user.publicKey.toBuffer(), mint.toBuffer()])
    vaultStatePda = pda
    vaultAta = getAssociatedTokenAddressSync(mint, vaultStatePda, true, TOKEN_PROGRAM_ID);
    
  })

  it("Initialize vault", async () => {
    const target = new anchor.BN(10_000_000)
    await program.methods.initialize(target)
    .accounts({
      user: user.publicKey,
      vaultState: vaultStatePda,
      vault: vaultAta,
      userMintTokenAccount: userAta,
      mint: mint,
      associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID

    })
    .signers([user])
    .rpc()

    const vaultStateAccount = await program.account.vaultState.fetch(vaultStatePda);
    console.log(vaultStateAccount.target.toString());

    assert.equal(vaultStateAccount.target.toString(), target.toString())
    assert.equal(vaultStateAccount.token.toString(), mint.toString())

  });

  it("Deposit Token", async () => {
    const depositAmount = new anchor.BN(30_000_000)
    await program.methods.deposit(depositAmount)
    .accounts({
      user: user.publicKey,
      vaultState: vaultStatePda,
      vault: vaultAta,
      userMintTokenAccount: userAta,
      mint: mint,
      associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID

    })
    .signers([user])
    .rpc()

    const vaultAccount = await getAccount(provider.connection, vaultAta)
    const userAccount = await getAccount(provider.connection, userAta)
    assert.equal(vaultAccount.amount.toString(), depositAmount.toString());
    assert.equal(vaultAccount.mint.toString(), mint.toString());

    const remainingAmount = new anchor.BN(1_000_000_000).sub(depositAmount);
    assert.equal(userAccount.amount.toString(), remainingAmount.toString());
  });



  it("Deposit Token, Invalid amount", async () => {
    const depositAmount = new anchor.BN(0)
    try{
      await program.methods.deposit(depositAmount)
    .accounts({
      user: user.publicKey,
      vaultState: vaultStatePda,
      vault: vaultAta,
      userMintTokenAccount: userAta,
      mint: mint,
      associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID

    })
    .signers([user])
    .rpc()
    }catch(err){
      const anchorError = err as anchor.AnchorError;

      assert.equal(anchorError.error.errorCode.code, "InvalidTokenAmount")
      assert.equal(anchorError.error.errorMessage, "Token amount is invalid")
    }
    
  });

  it("Withdraw Token", async () => {

    await program.methods.withdraw()
    .accounts({
      user: user.publicKey,
      vaultState: vaultStatePda,
      vault: vaultAta,
      userMintTokenAccount: userAta,
      mint: mint,
      associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID

    })
    .signers([user])
    .rpc()

    const vaultAccount = await getAccount(provider.connection, vaultAta)
    const userAccount = await getAccount(provider.connection, userAta)

    assert.equal(vaultAccount.amount.toString(), "0");

    const initialAmount = new anchor.BN(1_000_000_000)
    assert.equal(userAccount.amount.toString(), initialAmount.toString());
  });
});
