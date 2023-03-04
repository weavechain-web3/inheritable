const Form = ({ field, onChangeFunc, placeholder, styling }) => {
  return (
    <input className={"rounded-sm text-black p-1 bg-slate-300 focus:bg-white " + styling} onChange={onChangeFunc} type="text" value={field} placeholder={placeholder} />
  )
}

export default Form;