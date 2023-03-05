const Form = ({ field, onChangeFunc, placeholder, styling }) => {

  field === ""
    ? styling = "rounded-sm text-black p-1 bg-zinc-100 focus:bg-white " + styling
    : styling = "rounded-sm text-black p-1 bg-zinc-500 focus:bg-white " + styling
  return (
    (<input className={styling} onChange={onChangeFunc} type="text" value={field} placeholder={placeholder} />)
  )
}

export default Form;