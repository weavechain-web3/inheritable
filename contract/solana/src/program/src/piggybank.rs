// A mini test piggy bank smart contract that has a similar logic

// Import required libraries
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    program_pack::{IsInitialized, Pack, Sealed},
    sysvar::{rent::Rent, Sysvar},
};

// Define the data struct that will be stored in the account
#[derive(Clone, Debug, Default, PartialEq)]
pub struct PiggyBank {
    pub is_initialized: bool,
    pub balance: u64,
}

// Implement the IsInitialized trait for PiggyBank
impl IsInitialized for PiggyBank {
    fn is_initialized(&self) -> bool {
        self.is_initialized
    }
}

// Implement the Sealed trait for PiggyBank
impl Sealed for PiggyBank {}

// Implement the Pack trait for PiggyBank
impl Pack for PiggyBank {
    const LEN: usize = 9; // size of PiggyBank in bytes

    fn pack_into_slice(&self, output: &mut [u8]) {
        let data = self.serialize();
        output.copy_from_slice(&data);
    }

    fn unpack_from_slice(input: &[u8]) -> Result<Self, ProgramError> {
        Self::deserialize(input).map_err(|_| ProgramError::InvalidAccountData)
    }
}

// Define the program ID
const PROGRAM_ID: [u8; 32] = [0x69, 0x6d, 0x61, 0x67, 0x69, 0x6e, 0x65, 0x2e, 0x70, 0x69, 0x67, 0x67, 0x79, 0x62, 0x61, 0x6e, 0x6b, 0x2e, 0x31, 0x32, 0x8e, 0x2e, 0x64, 0x12, 0xda, 0xad, 0xb2, 0xfa, 0x35, 0xad, 0xf1, 0xcd];

// Define the program entrypoint
entrypoint!(process_instruction);

// Define the program logic
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    // Parse the instruction data
    let instruction = match instruction_data.get(0) {
        Some(&1) => Instruction::Deposit(instruction_data[1..].to_vec()),
        Some(&2) => Instruction::Withdraw,
        _ => return Err(ProgramError::InvalidInstructionData),
    };

    // Get the account that the program is running on
    let account_info_iter = &mut accounts.iter();
    let program_account = next_account_info(account_info_iter)?;

    // Verify that the program ID is correct
    if program_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    // Get the account that will hold the piggy bank data
    let data_account = next_account_info(account_info_iter)?;

    // Verify that the data account is initialized
    let mut data = PiggyBank::unpack_unchecked(&data_account.data.borrow())?;
    if !data.is_initialized() {
        return Err(ProgramError::UninitializedAccount);
    }

    // Get the account that will hold the SOL funds
    let mut sol_account = next_account_info(account_info_iter)?;

    // Verify that the SOL account is owned by the system
    if sol_account.owner != &solana_program::system_program::id() {
        return Err(ProgramError::IncorrectProgramId);
    }

    // Verify that the SOL account has enough balance for the transaction
    let rent = &Rent::from_account_info(next_account_info(account_info_iter)?)?;
    let required_lamports = rent.minimum_balance(PiggyBank::LEN);
    if sol_account.lamports() < required_lamports {
        return Err(ProgramError::InsufficientFunds);
    }

    match instruction {
        Instruction::Deposit(amount_bytes) => {
            // Parse the amount of SOL to deposit
            let amount = u64::from_le_bytes(
                amount_bytes
                    .try_into()
                    .or(Err(ProgramError::InvalidInstructionData))?,
            );

            // Transfer the SOL from the user account to the program account
            **sol_account.lamports.borrow_mut() -= amount;
            **data_account.lamports.borrow_mut() += amount;
            data.balance += amount;
            PiggyBank::pack(data, &mut data_account.data.borrow_mut())?;

            msg!("Deposited {} SOL to the piggy bank", amount);
        }
        Instruction::Withdraw => {
            // Verify that the balance is greater than 100 SOL
            if data.balance < 100 {
                return Err(ProgramError::InvalidInstructionData);
            }

            // Transfer the SOL from the program account to the user account
            **sol_account.lamports.borrow_mut() += data.balance;
            **data_account.lamports.borrow_mut() -= data.balance;
            data.balance = 0;
            PiggyBank::pack(data, &mut data_account.data.borrow_mut())?;

            msg!("Withdrew {} SOL from the piggy bank", data.balance);
        }
    }

    Ok(())
}

// Define the instruction enum
#[derive(Debug)]
enum Instruction {
    Deposit(Vec<u8>),
    Withdraw,
}

// Define the pack and unpack functions for the instruction enum
impl Pack for Instruction {
    const LEN: usize = 9;
    fn pack_into_slice(&self, output: &mut [u8]) {
        match self {
            Instruction::Deposit(amount_bytes) => {
                output[0] = 1;
                output[1..].copy_from_slice(amount_bytes);
            }
            Instruction::Withdraw => {
                output[0] = 2;
            }
        }
    }

    fn unpack_from_slice(input: &[u8]) -> Result<Self, ProgramError> {
        match input.get(0) {
            Some(&1) => {
                let amount_bytes = input[1..].try_into().or(Err(ProgramError::InvalidAccountData))?;
                Ok(Instruction::Deposit(amount_bytes.to_vec()))
            }
            Some(&2) => Ok(Instruction::Withdraw),
            _ => Err(ProgramError::InvalidAccountData),
        }
    }
}

// You can use this entire code to deploy a piggy bank smart contract on the Solana blockchain,
// which allows users to deposit and withdraw SOL funds with the condition that the balance is
// greater than 100 SOL.
