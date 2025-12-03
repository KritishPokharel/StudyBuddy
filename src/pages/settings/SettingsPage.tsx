
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage
} from "@/components/ui/form";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Monitor, Languages, Settings, User, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { supabase } from '@/lib/supabase';

interface SettingsFormValues {
  name: string;
  email: string;
  newPassword: string;
  confirmPassword: string;
  theme: string;
  language: string;
}

const SettingsPage = () => {
  const { toast } = useToast();
  const { user, updateProfile, updatePassword } = useAuth();
  const { theme, setTheme, systemTheme } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [themeChanged, setThemeChanged] = useState(false);
  
  // Get current theme (handle system theme) - use resolved theme for form
  const resolvedTheme = theme === 'system' ? systemTheme : theme;
  
  const defaultValues: SettingsFormValues = {
    name: user?.name || '',
    email: user?.email || '',
    newPassword: '',
    confirmPassword: '',
    theme: (theme || 'light') as string, // Use actual theme value, not resolved
    language: "english"
  };
  
  const form = useForm<SettingsFormValues>({
    defaultValues
  });

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update form when user data or theme changes
  useEffect(() => {
    if (user && mounted) {
      form.reset({
        name: user.name || '',
        email: user.email || '',
        newPassword: '',
        confirmPassword: '',
        theme: (theme || 'light') as string, // Use actual theme value
        language: "english"
      });
      setThemeChanged(false); // Reset when form is reset
    }
  }, [user, theme, form, mounted]);
  
  const onSubmit = async (data: SettingsFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Update profile (name and/or email)
      const profileUpdates: { name?: string; email?: string } = {};
      let hasProfileChanges = false;

      if (data.name !== user?.name) {
        profileUpdates.name = data.name;
        hasProfileChanges = true;
      }

      if (data.email !== user?.email) {
        profileUpdates.email = data.email;
        hasProfileChanges = true;
      }

      if (hasProfileChanges) {
        await updateProfile(profileUpdates);
        toast({
          title: "Profile updated",
          description: "Your profile information has been updated successfully.",
        });
      }

      // Update password if provided
      if (data.newPassword && data.newPassword.trim() !== '') {
        if (data.newPassword !== data.confirmPassword) {
          toast({
            title: "Password mismatch",
            description: "New password and confirm password do not match.",
            variant: "destructive"
          });
          setIsSubmitting(false);
          return;
        }

        if (data.newPassword.length < 6) {
          toast({
            title: "Password too short",
            description: "Password must be at least 6 characters long.",
            variant: "destructive"
          });
          setIsSubmitting(false);
          return;
        }

        setIsUpdatingPassword(true);
        try {
          await updatePassword(data.newPassword);
          toast({
            title: "Password updated",
            description: "Your password has been updated successfully.",
          });
          
          // Clear password fields
          form.setValue('newPassword', '');
          form.setValue('confirmPassword', '');
        } catch (passwordError: any) {
          toast({
            title: "Password update failed",
            description: passwordError.message || "Failed to update password. Please try again.",
            variant: "destructive"
          });
          throw passwordError; // Re-throw to be caught by outer catch
        } finally {
          setIsUpdatingPassword(false);
        }
      }

      // Update theme if changed
      if (data.theme && data.theme !== theme) {
        setTheme(data.theme);
        setThemeChanged(false); // Reset the changed flag
        // Save theme preference to Supabase user metadata
        try {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser) {
            await supabase.auth.updateUser({
              data: {
                ...(currentUser.user_metadata || {}),
                theme: data.theme,
              }
            });
          }
        } catch (themeError) {
          console.error('Failed to save theme preference:', themeError);
          // Theme still changes locally even if save fails
        }
      } else if (themeChanged) {
        // If theme was changed but is now back to original, reset flag
        setThemeChanged(false);
      }

      if (!hasProfileChanges && !data.newPassword && (!data.theme || data.theme === theme)) {
        toast({
          title: "No changes",
          description: "No changes to save.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="h-6 w-6 text-studypurple-500" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Profile Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-studypurple-400" />
                  <CardTitle>Profile Settings</CardTitle>
                </div>
                <CardDescription>Update your profile information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your full name" 
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="Enter your email" 
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        You may need to verify your new email address
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Password Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-studypurple-400" />
                  <CardTitle>Change Password</CardTitle>
                </div>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder="Enter new password" 
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Leave blank if you don't want to change your password
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder="Confirm new password" 
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Appearance Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-studypurple-400" />
                  <CardTitle>Appearance</CardTitle>
                </div>
                <CardDescription>Customize your app experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="theme"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Theme</FormLabel>
                      <FormControl>
                        <ToggleGroup
                          type="single"
                          value={field.value}
                          onValueChange={(value) => {
                            if (value) {
                              field.onChange(value);
                              // Check if theme actually changed
                              if (value !== theme) {
                                setThemeChanged(true);
                              } else {
                                setThemeChanged(false);
                              }
                            }
                          }}
                          className="justify-start"
                          disabled={!mounted}
                        >
                          <ToggleGroupItem value="light" aria-label="Light Mode">
                            Light
                          </ToggleGroupItem>
                          <ToggleGroupItem value="dark" aria-label="Dark Mode">
                            Dark
                          </ToggleGroupItem>
                          <ToggleGroupItem value="system" aria-label="System Default">
                            System
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </FormControl>
                      <FormDescription>
                        {!mounted 
                          ? 'Loading theme...'
                          : themeChanged
                          ? 'Please click "Save Changes" to apply this theme'
                          : field.value === 'system'
                          ? 'Uses your system preference'
                          : `${field.value === 'dark' ? 'Dark' : 'Light'} theme is active`}
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Language Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Languages className="h-5 w-5 text-studypurple-400" />
                  <CardTitle>Language</CardTitle>
                </div>
                <CardDescription>Choose your preferred language</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Language Preference</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="english">English</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Other languages are coming soon!
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <Button 
                type="submit" 
                className="bg-studypurple-500 text-white"
                disabled={isSubmitting || isUpdatingPassword}
              >
                {isSubmitting || isUpdatingPassword ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default SettingsPage;
