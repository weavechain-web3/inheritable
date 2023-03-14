import { useEffect, useState } from "react";

export function NavBar() {
  // Top Navigation Bar Element
  return (

    <header className="bg-gray-400">
      <div className="px-6 mx-auto max-w-screen-xl sm:px-6 lg:px-8 items-center">

        <div className="flex items-center justify-between h-16">
          <div className="flex-1 md:flex md:items-center md:gap-12">

            <img
              src="logo_title.svg"
              alt="logo"
              width={150}
              height={150}
            />

          </div>

         <div className="flex text-sm items-center gap-6 justify-start pl-4">
          <div href="">
              <p className="text-white transition hover:text-white/75">
                Dashboard
              </p>
          </div>

          </div>


        </div>
      </div>
    </header>
  )
}
