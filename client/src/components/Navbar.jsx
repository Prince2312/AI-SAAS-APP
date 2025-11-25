import React from 'react'
import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useClerk, UserButton, useUser } from '@clerk/clerk-react'

const Navbar = () => {

    const navigate = useNavigate()

    const { user } = useUser()
    const { openSignIn } = useClerk()

    return (
        <div className=' top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-xl flex justify-between
         items-center py-3 px-4 sm:px-20 xl:px-10 border-b border-gray-200'>
            <div className='flex gap-2 items-center cursor-pointer'
                onClick={() => navigate('/')}>
                <img src={assets.logo} alt="logo" className='w-8 h-12 sm:w-10 sm:h-12' onClick={() =>
                    navigate('/')} />
                <h1 className='text-xl font-semibold text-gray-800'>
                    RawAI
                </h1>

            </div>
            {
                user ? <UserButton />
                    : (
                        <button onClick={openSignIn} className='flex items-center gap-2 rounded-full text-sm
                      cursor-pointer bg-primary text-white px-10 py-2.5'>
                            Get Started<ArrowRight className='w-4 h-4' /></button>
                    )
            }
        </div>
    )
}

export default Navbar