import { useState } from 'react'
import Form from './form.js'

const Claim = ({ itemNo, field1, field2, field3, onChange1, onChange2, onChange3 }) => {

  return (
    <div className='rounded-md bg-black text-gray px-8 py-4 flex flex-col items-start m-3'>
      <p className='text-l pb-2 font-bold'>{`Item ${itemNo} Description`}</p>
      <Form styling="w-full h-8" field={field1} onChangeFunc={onChange1} placeholder={"Write Claim"} />
      <p className='text-l py-2 font-semibold'>Amount to Beneficiary</p>
      <Form styling="w-1/5 h-8 pb-1" field={field2} onChangeFunc={onChange2} placeholder={"Amount in USDC"} />
      <p className='text-l py-2 font-semibold'>Beneficiary Wallet</p>
      <Form styling="w-full h-8 " field={field3} onChangeFunc={onChange3} placeholder={"Recipient Wallet"} />
    </div>
  )
}

export default Claim;
