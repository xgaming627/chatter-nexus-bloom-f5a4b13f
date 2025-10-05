import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, User } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';

const Profile: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { profile, updateProfile } = useProfile();
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
      return;
    }

    setDisplayName(profile.displayName || '');
    setDescription(profile.description || '');
    setPhotoURL(profile.photoURL || '');
  }, [currentUser, navigate, profile]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File size must be less than 20MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser?.uid}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('Images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('Images')
        .getPublicUrl(filePath);

      setPhotoURL(data.publicUrl);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const success = await updateProfile({
        displayName: displayName.trim(),
        description: description.trim(),
        photoURL: photoURL.trim()
      });

      if (success) {
        toast.success('Profile updated successfully');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="h-8 w-8" />
            <h1 className="text-3xl font-bold">My Profile</h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to Chat
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-32 w-32">
                <AvatarImage src={photoURL || profile.photoURL} />
                <AvatarFallback className="text-3xl">
                  {displayName?.[0]?.toUpperCase() || profile.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="photo-url">Profile Picture URL</Label>
              <Input
                id="photo-url"
                placeholder="https://example.com/image.jpg"
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Or paste a URL to an image
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                placeholder="Your display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={profile.username || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Username cannot be changed
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Bio</Label>
              <Textarea
                id="description"
                placeholder="Tell us about yourself..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/')}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
