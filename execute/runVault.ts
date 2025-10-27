import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Vault } from "../target/types/vault";
import idl from "../target/idl/vault.json"
import { createMint, createAssociatedTokenAccount, mintTo, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, getAccount } from "@solana/spl-token";
import { Connection, clusterApiUrl } from "@solana/web3.js";
import fs from "fs"

function loadKeypairFromFile(secretFilePath: string){
    const secret = JSON.parse(fs.readFileSync(secretFilePath, "utf-8"));
    const secretKey = Uint8Array.from(secret)
    return anchor.web3.Keypair.fromSecretKey(secretKey)
}
const user = loadKeypairFromFile("./vauBpkWG12Q1EhvY2D52zngz89Dw7jXnvramR61DSN8.json");


const commitmentLevel = "confirmed";
const endpoint = clusterApiUrl("devnet");
const connection = new Connection(endpoint, commitmentLevel);
const vaultProgramInterface = JSON.parse(JSON.stringify(idl));

const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(user), { preflightCommitment: commitmentLevel })

const program = new Program(vaultProgramInterface, provider) as Program<Vault>


const mint = new anchor.web3.PublicKey("BzezyWUhhQK2K84uypVnXHSojxcDMt2ZyymfwcWj1TVR")
const tokenAuthority = loadKeypairFromFile("./SPLgr2inWZN3gKPAHv3a6q3E1xA3zpbmEmJyznefkqQ.json")

async function getPda(seeds) {
    const [pda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      seeds,
      program.programId
    );

    return {pda, bump}
  }
async function mintToken(user: anchor.web3.Keypair){
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
    tokenAuthority,
    10_000_000
  );
  console.log("Token minted successfully")
  return userAta ;
  }

async function getAirdrop(
    publicKey: anchor.web3.PublicKey,
    amount: number = 5 * anchor.web3.LAMPORTS_PER_SOL
){
    const airdropTxn = await provider.connection.requestAirdrop(
    publicKey,
    amount
    );

    await provider.connection.confirmTransaction(airdropTxn);
    console.log("Airdop successfull")
}


async function main(){
    // await getAirdrop(user.publicKey)
    const userAta = await mintToken(user)
    const {pda: vaultStatePda} = await getPda([Buffer.from("vault_state"), user.publicKey.toBuffer(), mint.toBuffer()])

    const vaultAta = getAssociatedTokenAddressSync(mint, vaultStatePda, true, TOKEN_PROGRAM_ID);

    console.log("Initialize vault")
    const target = new anchor.BN(10_000_000)
    const initTxnSig =  await program.methods.initialize(target)
        .accounts({
          user: user.publicKey,
          vaultState: vaultStatePda,
          vault: vaultAta,
          userMintTokenAccount: userAta,
          mint: mint,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID
    
        } as any)
        .signers([user])
        .rpc()

    console.log(`Initialize Vault: ${initTxnSig}`)

    const depositAmount = new anchor.BN(5_000_000)
    const depositTxnSig = await program.methods.deposit(depositAmount)
        .accounts({
          user: user.publicKey,
          vaultState: vaultStatePda,
          vault: vaultAta,
          userMintTokenAccount: userAta,
          mint: mint,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID
    
        }as any)
        .signers([user])
        .rpc()

    console.log(`Deposit to Vault: ${depositTxnSig}`)
}

main()