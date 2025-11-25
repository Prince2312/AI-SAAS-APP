import { Scissors, Sparkles, Upload, AlertCircle } from 'lucide-react'
import React, { useState } from 'react'
import axios from 'axios'
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const RemoveObject = () => {
  const [input, setInput] = useState(null)
  const [object, setObject] = useState('')
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')

  const { getToken } = useAuth()

  // Handle file input with preview
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB')
      return
    }

    setInput(file)
    setError('')
    
    // Create preview
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
  }

  const onSubmitHandler = async (e) => {
    e.preventDefault()
    
    if (!input) {
      toast.error('Please select an image')
      return
    }

    if (!object.trim()) {
      toast.error('Please enter an object name')
      return
    }

    if (object.trim().split(' ').length > 1) {
      toast.error('Please enter only one object name')
      return
    }

    try {
      setLoading(true)
      setError('')

      const formData = new FormData()
      formData.append('image', input)
      formData.append('object', object.trim().toLowerCase())
      
      const token = await getToken()

      const { data } = await axios.post('/api/ai/remove-image-object', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      if (data.success) {
        setContent(data.content)
        toast.success('Object removed successfully!')
      } else {
        toast.error(data.message || 'Failed to remove object')
      }
    } catch (error) {
      console.error('Error removing object:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Something went wrong'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Clean up object URLs
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const resetForm = () => {
    setInput(null)
    setObject('')
    setContent('')
    setPreviewUrl('')
    setError('')
  }

  return (
    <div className='h-full overflow-y-auto p-6 flex flex-col md:flex-row items-start gap-6 text-slate-700'>
      {/* Left col - Input Form */}
      <form onSubmit={onSubmitHandler} className='w-full md:max-w-lg p-6 bg-white rounded-lg border border-gray-200 shadow-sm'>
        <div className='flex items-center gap-3 mb-6'>
          <Sparkles className='w-6 h-6 text-[#4A7AFF]' />
          <h1 className='text-xl font-semibold'>Object Removal</h1>
        </div>

        {/* File Upload Section */}
        <div className='mb-6'>
          <label className='block text-sm font-medium mb-2'>Upload Image</label>
          <div className='border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-[#4A7AFF] transition-colors'>
            <input 
              onChange={handleFileChange} 
              type='file' 
              accept='image/*' 
              className='hidden' 
              id='file-upload'
              required 
            />
            <label htmlFor='file-upload' className='cursor-pointer'>
              <Upload className='w-8 h-8 text-gray-400 mx-auto mb-2' />
              <p className='text-sm text-gray-600'>
                {input ? input.name : 'Click to upload or drag and drop'}
              </p>
              <p className='text-xs text-gray-400 mt-1'>PNG, JPG, JPEG (Max 5MB)</p>
            </label>
          </div>
          {previewUrl && (
            <div className='mt-3'>
              <p className='text-sm font-medium mb-2'>Preview:</p>
              <img 
                src={previewUrl} 
                alt="Preview" 
                className='w-full h-32 object-cover rounded-lg border'
              />
            </div>
          )}
        </div>

        {/* Object Input Section */}
        <div className='mb-6'>
          <label className='block text-sm font-medium mb-2'>
            Object to Remove
          </label>
          <input 
            onChange={(e) => setObject(e.target.value)} 
            value={object}
            type='text'
            className='w-full p-3 outline-none text-sm rounded-md border border-gray-300 focus:border-[#4A7AFF] focus:ring-1 focus:ring-[#4A7AFF]'
            placeholder='e.g., watch, spoon, car... (single object only)'
            required 
          />
          <p className='text-xs text-gray-500 mt-1'>
            Enter only one object name to remove from the image
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className='flex items-center gap-2 p-3 mb-4 text-sm text-red-600 bg-red-50 rounded-lg'>
            <AlertCircle className='w-4 h-4' />
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className='flex gap-3'>
          <button
            type='button'
            onClick={resetForm}
            disabled={loading}
            className='flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50'
          >
            Reset
          </button>
          <button 
            disabled={loading || !input}
            className='flex-1 flex justify-center items-center gap-2 bg-gradient-to-r from-[#417DF6] to-[#8E37EB] text-white px-4 py-2 text-sm rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {loading ? (
              <span className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></span>
            ) : (
              <Scissors className='w-4 h-4' />
            )}
            {loading ? 'Removing...' : 'Remove Object'}
          </button>
        </div>
      </form>

      {/* Right col - Result */}
      <div className='w-full md:max-w-lg p-6 bg-white rounded-lg border border-gray-200 shadow-sm min-h-[400px]'>
        <div className='flex items-center gap-3 mb-6'>
          <Scissors className='w-5 h-5 text-[#4A7AFF]' />
          <h1 className='text-xl font-semibold'>Processed Image</h1>
        </div>
        
        {!content ? (
          <div className='flex-1 flex justify-center items-center h-64'>
            <div className='text-center text-gray-400'>
              <Scissors className='w-12 h-12 mx-auto mb-3 opacity-50' />
              <p className='text-sm'>Upload an image and click "Remove Object" to get started</p>
            </div>
          </div>
        ) : (
          <div className='space-y-4'>
            <img 
              src={content} 
              alt="Processed result" 
              className='w-full rounded-lg border shadow-sm'
            />
            <div className='flex justify-center'>
              <a
                href={content}
                download="processed-image.png"
                className='px-4 py-2 text-sm bg-[#4A7AFF] text-white rounded-lg hover:bg-[#3A6AE8] transition-colors'
              >
                Download Image
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RemoveObject