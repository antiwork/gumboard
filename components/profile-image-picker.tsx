"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Loader2, Check, User, Github, Mail, X, RefreshCw, Upload, ImageIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AvatarOption {
  id: string
  name: string
  url: string | null
  icon: React.ReactNode
  description: string
  available: boolean
}

interface ProfileImagePickerProps {
  userEmail: string
  userName?: string
  currentImage?: string | null
  onImageSelected?: (imageUrl: string | null, source: string) => void
  showTitle?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function ProfileImagePicker({ 
  userEmail, 
  userName, 
  currentImage, 
  onImageSelected,
  showTitle = true,
  size = 'md'
}: ProfileImagePickerProps) {
  const [avatarOptions, setAvatarOptions] = useState<AvatarOption[]>([])
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [customUrl, setCustomUrl] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const avatarSizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20'
  }

  const fetchAvatarOptions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/user/avatar')
      if (response.ok) {
        const data = await response.json()
        
        const options: AvatarOption[] = [
          {
            id: 'current',
            name: 'Current',
            url: data.current,
            icon: <User className="w-4 h-4" />,
            description: 'Your current profile picture',
            available: !!data.current
          },
          {
            id: 'gravatar',
            name: 'Gravatar',
            url: data.gravatar,
            icon: <Mail className="w-4 h-4" />,
            description: 'Global avatar from your email',
            available: true // We'll check availability when selected
          },
          {
            id: 'github',
            name: 'GitHub',
            url: data.github,
            icon: <Github className="w-4 h-4" />,
            description: 'Avatar from your GitHub profile',
            available: data.hasGithub
          }
        ]

        setAvatarOptions(options)
        
        // Set initial selection
        if (data.current) {
          setSelectedOption('current')
        } else if (data.suggested) {
          const suggestedOption = options.find(opt => opt.url === data.suggested)
          if (suggestedOption) {
            setSelectedOption(suggestedOption.id)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching avatar options:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAvatarOptions()
  }, [])

  const handleOptionSelect = async (optionId: string) => {
    if (updating) return
    
    setUpdating(true)
    try {
      let response
      
      if (optionId === 'custom' && customUrl) {
        response = await fetch('/api/user/avatar', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: customUrl })
        })
      } else if (optionId === 'remove') {
        response = await fetch('/api/user/avatar', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'remove' })
        })
      } else {
        const selectedAvatarOption = avatarOptions.find(opt => opt.id === optionId)
        if (!selectedAvatarOption) return

        response = await fetch('/api/user/avatar', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: optionId })
        })
      }

      if (response?.ok) {
        const userData = await response.json()
        setSelectedOption(optionId)
        
        // Update the current option with the new image
        setAvatarOptions(prev => prev.map(opt => 
          opt.id === 'current' 
            ? { ...opt, url: userData.image, available: !!userData.image }
            : opt
        ))

        onImageSelected?.(userData.image, optionId)
      } else {
        const error = await response?.json()
        console.error('Error updating avatar:', error)
      }
    } catch (error) {
      console.error('Error updating avatar:', error)
    } finally {
      setUpdating(false)
    }
  }

  const handleCustomUrlSubmit = () => {
    if (customUrl.trim()) {
      handleOptionSelect('custom')
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await fetch('/api/user/avatar/upload', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const userData = await response.json()
        
        // Update the current option with the new image
        setAvatarOptions(prev => prev.map(opt => 
          opt.id === 'current' 
            ? { ...opt, url: userData.image, available: !!userData.image }
            : opt
        ))
        
        setSelectedOption('current')
        onImageSelected?.(userData.image, 'upload')
      } else {
        const error = await response.json()
        console.error('Error uploading file:', error)
        alert(error.error || 'Failed to upload image')
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Failed to upload image')
    } finally {
      setUploadingFile(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {showTitle && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Choose Profile Picture</h3>
          <p className="text-sm text-muted-foreground">
            Select from available options or add a custom image URL
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {avatarOptions.map((option) => (
          <Card
            key={option.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedOption === option.id 
                ? 'ring-2 ring-ring bg-accent dark:bg-accent/50' 
                : ''
            } ${!option.available ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => option.available && handleOptionSelect(option.id)}
          >
            <CardContent className="p-4 flex flex-col items-center space-y-3">
              <div className="relative">
                <Avatar className={avatarSizeClasses[size]}>
                  <AvatarImage 
                    src={option.url || undefined} 
                    alt={`${option.name} avatar`}
                  />
                  <AvatarFallback className="bg-muted">
                    <span className="text-foreground font-semibold">
                      {userName?.charAt(0)?.toUpperCase() || userEmail.charAt(0).toUpperCase()}
                    </span>
                  </AvatarFallback>
                </Avatar>
                {selectedOption === option.id && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
                {updating && selectedOption === option.id && (
                  <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  </div>
                )}
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  {option.icon}
                  <span className="font-medium text-sm">{option.name}</span>
                  {!option.available && (
                    <Badge variant="secondary" className="text-xs">
                      N/A
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* File Upload Option */}
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            uploadingFile ? 'ring-2 ring-ring bg-accent dark:bg-accent/50' : ''
          }`}
          onClick={triggerFileUpload}
        >
          <CardContent className="p-4 flex flex-col items-center space-y-3">
            <div className="relative">
              <Avatar className={avatarSizeClasses[size]}>
                <AvatarFallback className="bg-muted">
                  {uploadingFile ? (
                    <Loader2 className="w-4 h-4 text-foreground animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 text-foreground" />
                  )}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <ImageIcon className="w-4 h-4" />
                <span className="font-medium text-sm">Upload Image</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {uploadingFile ? 'Uploading...' : 'Upload from device'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Custom URL Option */}
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            showCustomInput ? 'ring-2 ring-ring bg-accent dark:bg-accent/50' : ''
          }`}
          onClick={() => setShowCustomInput(!showCustomInput)}
        >
          <CardContent className="p-4 flex flex-col items-center space-y-3">
            <div className="relative">
              <Avatar className={avatarSizeClasses[size]}>
                <AvatarFallback className="bg-muted">
                  <span className="text-foreground font-semibold">URL</span>
                </AvatarFallback>
              </Avatar>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <User className="w-4 h-4" />
                <span className="font-medium text-sm">Custom URL</span>
              </div>
              <p className="text-xs text-muted-foreground">Add image URL</p>
            </div>
          </CardContent>
        </Card>

        {/* Remove Picture Option */}
        {currentImage && (
          <Card
            className="cursor-pointer transition-all hover:shadow-md hover:bg-destructive/10 dark:hover:bg-destructive/20"
            onClick={() => handleOptionSelect('remove')}
          >
            <CardContent className="p-4 flex flex-col items-center space-y-3">
              <div className="relative">
                <Avatar className={avatarSizeClasses[size]}>
                  <AvatarFallback className="bg-muted">
                    <X className="w-4 h-4 text-foreground" />
                  </AvatarFallback>
                </Avatar>
                {updating && selectedOption === 'remove' && (
                  <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  </div>
                )}
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <X className="w-4 h-4" />
                  <span className="font-medium text-sm">Remove</span>
                </div>
                <p className="text-xs text-muted-foreground">Use default avatar</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Custom URL Input */}
      {showCustomInput && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 space-y-3">
            <Label htmlFor="custom-url">Image URL</Label>
            <div className="flex space-x-2">
              <Input
                id="custom-url"
                type="url"
                placeholder="https://example.com/avatar.jpg"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleCustomUrlSubmit}
                disabled={!customUrl.trim() || updating}
                size="sm"
              >
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter a direct link to an image (JPG, PNG, GIF)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      <div className="flex justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAvatarOptions}
          disabled={loading}
          className="text-sm"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh Options
        </Button>
      </div>
    </div>
  )
}
