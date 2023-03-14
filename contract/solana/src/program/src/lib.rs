use borsh::{BorshDeserialize, BorshSerialize};
use std::{
    io::{prelude::*,  Cursor},
};
use std::str;
use std::collections::HashSet;
use byteorder::{LittleEndian, ReadBytesExt};
use solana_program::{
    account_info::{next_account_info, AccountInfo}, entrypoint, entrypoint::ProgramResult, msg,
    program_error::ProgramError, pubkey::Pubkey,
    program_pack::{Pack, Sealed},
};
use bs58;

const ACCOUNT_STATE_SPACE: usize = 10000;

pub fn buffer_to_string(buffer: &[u8]) -> &str {
    let s = match str::from_utf8(buffer) {
        Ok(v) => v,
        Err(e) => panic!("Invalid UTF-8 sequence: {}", e),
    };
    return s;
}

fn reset(dst: &mut [u8]) {
    for i in 0..dst.len() {
        dst[i] = 0;
    }
}

fn read_n<R>(reader: R, bytes_to_read: u64) -> Vec<u8>
where
    R: Read,
{
    let mut buf = vec![];
    let mut chunk = reader.take(bytes_to_read);
    let n = chunk.read_to_end(&mut buf).expect("Invalid data length");
    assert_eq!(bytes_to_read as usize, n);
    buf
}

entrypoint!(process_instruction);

#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub struct Oracles {
    pub accounts: Vec<String>
}

#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub struct Vote {
    pub source: String,
    pub signature: String,
}

impl Vote {
    pub fn new(source: String, signature: String) -> Self {
        Vote {
            source,
            signature,
        }
    }
}

#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub struct AccountData {
    pub is_unlocked: u8,
    pub oracles: Vec<String>,
    pub votes: Vec<Vote>
}

impl AccountData {
    pub fn set_unlocked(&mut self, val: u8) {
        self.is_unlocked = val;
    }
}

impl Sealed for AccountData {}


#[allow(clippy::ptr_offset_with_cast)]
impl Pack for AccountData {
    const LEN: usize = ACCOUNT_STATE_SPACE;

    fn unpack_from_slice(src: &[u8]) -> Result<Self, ProgramError> {
        let mut rdr = Cursor::new(src);

        let rdrlen = rdr.get_ref().len() as u32;

        let mut idx = 0;
        let is_unlocked = rdr.read_u8().unwrap();
        idx += 1;

        let leno = rdr.read_u32::<LittleEndian>().unwrap();
        idx += 4;
        let mut oracles = Vec::with_capacity(leno as usize);

        for _i in 0..leno {
            let len = rdr.read_u32::<LittleEndian>().unwrap();
            idx += 4;
            let data = read_n(&mut rdr, u64::from(len));
            idx += len;

            let o = String::from_utf8(data).unwrap();
            oracles.push(o);
        }

        let mut votes = Vec::new();
        if  idx < rdrlen {
            let lenv = rdr.read_u32::<LittleEndian>().unwrap();
            idx += 4;

            for _i in 0..lenv {
                let lenw = rdr.read_u32::<LittleEndian>().unwrap();
                idx += 4;
                let dataw = read_n(&mut rdr, u64::from(lenw));
                idx += lenw;
                let w = String::from_utf8(dataw).unwrap();

                let lens = rdr.read_u32::<LittleEndian>().unwrap();
                idx += 4;
                let datas = read_n(&mut rdr, u64::from(lens));
                idx += lens;
                let s = String::from_utf8(datas).unwrap();

                let vote = Vote::new(w, s);
                votes.push(vote);
            }
        }

        Ok(AccountData { is_unlocked, oracles, votes })
    }

    fn pack_into_slice(&self, dst: &mut [u8]) {
        let v = self;

        let mut idx = 0;
        let is_unlocked = v.is_unlocked;
        dst[idx] = is_unlocked;
        idx += 1;

        let leno = v.oracles.len();
        dst[idx..(idx+4)].copy_from_slice(&(leno as u32).to_le_bytes());
        idx += 4;

        for i in 0..leno {
            let len = v.oracles[i].len();
            dst[idx..(idx+4)].copy_from_slice(&(len as u32).to_le_bytes());
            idx += 4;

            dst[idx..(idx+len)].copy_from_slice(v.oracles[i].as_bytes());
            idx += len;
        }

        let lenv = v.votes.len();
        dst[idx..(idx+4)].copy_from_slice(&(lenv as u32).to_le_bytes());
        idx += 4;

        for i in 0..lenv {
            let lenw = v.votes[i].source.len();
            dst[idx..(idx+4)].copy_from_slice(&(lenw as u32).to_le_bytes());
            idx += 4;

            dst[idx..(idx+lenw)].copy_from_slice(v.votes[i].source.as_bytes());
            idx += lenw;

            let lens = v.votes[i].signature.len();
            dst[idx..(idx+4)].copy_from_slice(&(lens as u32).to_le_bytes());
            idx += 4;

            dst[idx..(idx+lens)].copy_from_slice(v.votes[i].signature.as_bytes());
            idx += lens;
        }
    }
}

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let account = next_account_info(accounts_iter)?;
    let account2 = next_account_info(accounts_iter)?;

    let mut rdr = Cursor::new(data);
    let instr = rdr.read_u8().unwrap();

    if instr == 0 {
        // reset the program

        {
            account.realloc(ACCOUNT_STATE_SPACE, true)?;
        }
        {
            let mut account_data = account.data.borrow_mut();
            reset(&mut account_data);
        }
        Ok(())
    } else if instr == 1 {
        // Oracle vote for death. If the new vote count is geq 2/3, set
        // account to be unlocked

        let mut account_data = account.data.borrow_mut();
        //msg!(type_of(&account_data));
        let mut acc = AccountData::unpack_from_slice(&account_data)?;

        let lenw = rdr.read_u32::<LittleEndian>().unwrap();
        let wb = read_n(&mut rdr, u64::from(lenw));
        let w = String::from_utf8(wb).unwrap();

        let lens = rdr.read_u32::<LittleEndian>().unwrap();
        let sb = read_n(&mut rdr, u64::from(lens));
        let s = String::from_utf8(sb).unwrap();

        let v = Vote::new(w, s);

        let pk = bs58::encode(account2.key.to_bytes()).into_string();
        let mut is_allowed = false;
        let leno = acc.oracles.len();
        for i in 0..leno {
            if acc.oracles[i].eq(&pk) {
                is_allowed = true;
            }
        }

        let mut vunique = HashSet::new();
        let lenv = acc.votes.len();
        for i in 0..lenv {
            vunique.insert(acc.votes[i].source.clone());
        }

        if is_allowed {
            vunique.insert(v.source.clone());
            acc.votes.push(v);
       } else {
            msg!("Not allowed");
            return Err(ProgramError::IncorrectProgramId);
        }

        if vunique.len() >= leno * 2 / 3 {
            acc.set_unlocked(1);

            // Transfer the SOL from the program account to the user account
            // **sol_account.lamports.borrow_mut() += data.balance;
            // **data_account.lamports.borrow_mut() -= data.balance;
            // data.balance = 0;
            // PiggyBank::pack(data, &mut data_account.data.borrow_mut())?;
            //
            // msg!("Withdrew {} SOL from the escrow", data.balance);
        }

        AccountData::pack_into_slice(&acc, &mut account_data);

        Ok(())
    } else if instr == 2 {
        // add oracle to the list

        // Verify the Program ID
        if account.owner != program_id {
            msg!("Not owner");
            return Err(ProgramError::IncorrectProgramId);
        }

        let mut account_data = account.data.borrow_mut();
        //msg!(type_of(&account_data));
        let mut acc = AccountData::unpack_from_slice(&account_data)?;

        let leno = rdr.read_u32::<LittleEndian>().unwrap(); // oracle length
        let mut oracles = Vec::with_capacity(leno as usize);

        for _i in 0..leno {
            let len = rdr.read_u32::<LittleEndian>().unwrap();
            let data = read_n(&mut rdr, u64::from(len));
            let o = String::from_utf8(data).unwrap();

            oracles.push(o);
        }

        acc.set_unlocked(0);
        acc.oracles = oracles;
        acc.votes = Vec::new();

        AccountData::pack_into_slice(&acc, &mut account_data);

        Ok(())
    }
    // else if instr == 3 {
    //     // fund account
    //
    //     // Parse the amount of SOL to deposit
    //     let amount = u64::from_le_bytes(
    //         amount_bytes
    //             .try_into()
    //             .or(Err(ProgramError::InvalidInstructionData))?,
    //     );
    //
    //     // Transfer the SOL from the user account to the program account
    //     **sol_account.lamports.borrow_mut() -= amount;
    //     **data_account.lamports.borrow_mut() += amount;
    //     data.balance += amount;
    //     PiggyBank::pack(data, &mut data_account.data.borrow_mut())?;
    //
    //     msg!("Deposited {} SOL to the escrow", amount);
    // }
    else {
        msg!("Invalid instruction");
        Err(ProgramError::InvalidInstructionData)
    }
}
