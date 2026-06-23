'use client'

import { useState, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { translations } from '@/lib/translations'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, Camera, User, Phone, MapPin, Calendar, Mail, Check, X } from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import { csrfFetch } from '@/lib/csrf-fetch'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

export default function ProfileTab() {
  const { user, setUser, language } = useAppStore()
  const t = translations[language]

  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [address, setAddress] = useState(user?.address || '')
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!user) return null

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'BUYER':
        return t.role_buyer
      case 'SELLER':
        return t.role_seller
      case 'SHIPPER':
        return t.role_shipper
      case 'ADMIN':
        return t.role_admin
      default:
        return role
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'BUYER':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'SELLER':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'SHIPPER':
        return 'bg-sky-100 text-sky-700 border-sky-200'
      case 'ADMIN':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      default:
        return ''
    }
  }

  const getRoleGradient = (role: string) => {
    switch (role) {
      case 'BUYER':
        return 'from-green-500 to-emerald-600'
      case 'SELLER':
        return 'from-amber-500 to-orange-600'
      case 'SHIPPER':
        return 'from-sky-500 to-blue-600'
      case 'ADMIN':
        return 'from-purple-500 to-indigo-600'
      default:
        return 'from-gray-500 to-gray-600'
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error(language === 'vi' ? 'Họ và tên không được để trống' : 'Full name cannot be empty')
      return
    }

    setIsLoading(true)
    try {
      const res = await csrfFetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, address }),
      })

      const data = await res.json()
      if (res.ok) {
        setUser(data.user)
        setIsEditing(false)
        toast.success(t.profile_update_success)
      } else {
        toast.error(data.error || t.profile_update_fail)
      }
    } catch (error) {
      console.error(error)
      toast.error(t.profile_update_fail)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    setIsUploading(true)
    try {
      // Step 1: Upload image to Cloudinary via our upload endpoint
      const uploadRes = await csrfFetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) {
        throw new Error(uploadData.error || 'Failed to upload image')
      }

      const avatarUrl = uploadData.url

      // Step 2: Save the new avatar URL to user profile
      const updateRes = await csrfFetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: avatarUrl }),
      })

      const updateData = await updateRes.json()
      if (updateRes.ok) {
        setUser(updateData.user)
        toast.success(t.profile_update_success)
      } else {
        toast.error(updateData.error || t.profile_update_fail)
      }
    } catch (error) {
      console.error(error)
      toast.error(t.profile_update_fail)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-foreground/90">{t.profile_title}</h2>
      
      <Card className="border-0 shadow-lg overflow-hidden bg-white/80 backdrop-blur-md rounded-2xl">
        {/* Banner with gradient matching role theme */}
        <div className={`h-32 bg-gradient-to-r ${getRoleGradient(user.role)} relative`} />
        
        <CardContent className="p-6 -mt-12 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div className="flex items-end gap-4">
              {/* Avatar section with hover zoom camera effect */}
              <div 
                className="w-24 h-24 rounded-2xl bg-white shadow-xl flex items-center justify-center text-4xl font-bold border-4 border-white overflow-hidden relative group cursor-pointer transition-transform hover:scale-105"
                onClick={handleAvatarClick}
              >
                {isUploading ? (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                ) : null}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 z-10">
                  <Camera className="h-6 w-6 text-white" />
                </div>
                {user.avatar ? (
                  <Avatar className="w-full h-full rounded-none">
                    <AvatarImage src={user.avatar} className="object-cover" />
                    <AvatarFallback className="rounded-none">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                ) : (
                  <span className="text-green-700">{user.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="pb-1">
                <h3 className="text-xl font-bold text-foreground/90">{user.name}</h3>
                <Badge className={`mt-1.5 border ${getRoleBadgeColor(user.role)} font-semibold`}>
                  {getRoleLabel(user.role)}
                </Badge>
              </div>
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleAvatarChange} 
              className="hidden" 
              accept="image/*"
            />

            {!isEditing && (
              <Button 
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
                className="shrink-0 font-semibold border-2 transition-all hover:bg-muted/50"
              >
                {t.edit}
              </Button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.form
                key="edit-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSave}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="edit-name">{t.profile_name}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="edit-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 transition-all focus:ring-2 focus:ring-green-100"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-phone">{t.profile_phone}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="edit-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10 transition-all focus:ring-2 focus:ring-green-100"
                      placeholder="e.g., 0901234567"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-address">{t.profile_address}</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="edit-address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="pl-10 transition-all focus:ring-2 focus:ring-green-100"
                      placeholder="e.g., Quận 1, TP. HCM"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => {
                      setName(user.name)
                      setPhone(user.phone || '')
                      setAddress(user.address || '')
                      setIsEditing(false)
                    }}
                    className="font-semibold"
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    {t.cancel}
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    ) : (
                      <Check className="h-4 w-4 mr-1.5" />
                    )}
                    {t.save}
                  </Button>
                </div>
              </motion.form>
            ) : (
              <motion.div
                key="read-details"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-muted/30 border border-muted/50 flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-0.5">{t.profile_email}</p>
                      <p className="text-sm font-semibold text-foreground/80">{user.email}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-muted/30 border border-muted/50 flex items-start gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-0.5">{t.profile_phone}</p>
                      <p className="text-sm font-semibold text-foreground/80">{user.phone || t.profile_not_updated}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-muted/30 border border-muted/50 flex items-start gap-3 sm:col-span-2">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-0.5">{t.profile_address}</p>
                      <p className="text-sm font-semibold text-foreground/80">{user.address || t.profile_not_updated}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-muted/30 border border-muted/50 flex items-start gap-3 sm:col-span-2">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-0.5">{t.profile_joined}</p>
                      <p className="text-sm font-semibold text-foreground/80">{formatDateTime(user.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  )
}
