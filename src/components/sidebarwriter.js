import logo from '../logo.svg';
import inherilogo from '../resources/inheri-logo.svg';
import verifySvg from "../resources/verify.svg";
import signSvg from "../resources/ri_quill-pen-fill.svg";
import witnessSvg from "../resources/witness.svg";

const SidebarWriter = ({ switchView }) => {
  return (
    <div className="fixed w-1/4 h-full">
      <div className='flex justify-center '>
        <img src={inherilogo} className="logo m-4 w-2/3 ml-2" alt="logo" />
      </div>
      <div className='text-white h-2/5 mt-10 text-md pl-8 flex flex-col justify-around'>
        <div>
          <div className='flex items-center justify-left'>
            <img src={signSvg} className="w-5 h-5 mr-2" alt="logo" />
            <a className='text-center ' >Enscribe Will Items</a>
          </div>
          <p className='font-light ml-7 text-zinc-500 text-xs'>Enter description, claim amount and beneficiary address</p>
        </div>

        <div>
          <div className='flex items-center justify-left'>
            <img src={signSvg} className="w-5 h-5 mr-2" alt="logo" />
            <a className='text-center ' >Set Witnesses of Passing</a>
          </div>
          <p className='font-light ml-7 text-zinc-500 text-xs'>2 of 3 witnesses are required for proof of passing</p>
        </div>

        <div>
          <div className='flex items-center justify-left'>
            <img src={signSvg} className="w-5 h-5 mr-2" alt="logo" />
            <a className='text-center ' >Sign Will</a>
          </div>
        </div>


        {/* <div className='flex items-center justify-left hover:underline hover:text-white hover:cursor-pointer' onClick={() => this.setState({ screen: 1 })}>
                        <img src={witnessSvg} className="w-5 h-5 mr-2" alt="logo" />
                        <p className='text-center'> Bear witness to passing </p>
                    </div>

                    <div className='flex items-center justify-left hover:underline hover:text-white hover:cursor-pointer' onClick={() => this.setState({ screen: 2 })}>
                        <img src={verifySvg} className="w-5 h-5 mr-2" alt="logo" />
                        <p className='text-center'> Verify and release will </p>
                    </div> */}
      </div>
      <div className='h-1/3 flex flex-col justify-end items-center'>
        <div className='flex flex-nowrap items-center'>
          <span className='text-white font-light text-m'>Powered by</span>
          <img src={logo} className="h-12 w-12 ml-2" onClick={() => switchView()} alt="logo" />
        </div>
      </div>
    </div>
  )
}

export default SidebarWriter