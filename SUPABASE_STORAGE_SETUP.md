# Supabase Storage Setup for Recipe Photos

This guide will help you set up Supabase Storage for recipe photo uploads.

## Step 1: Create the Storage Bucket

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on **Storage** in the left sidebar
4. Click **New bucket**
5. Configure the bucket:
   - **Name**: `recipe-photos`
   - **Public bucket**: ✅ Enable (checked)
   - **File size limit**: 10 MB (or higher if needed)
   - Click **Create bucket**

## Step 2: Set Up Storage Policies

After creating the bucket, you need to set up Row Level Security (RLS) policies:

1. Click on the `recipe-photos` bucket
2. Click on **Policies** tab
3. Create the following policies:

### Policy 1: Allow authenticated users to upload photos for their household

```sql
CREATE POLICY "Users can upload photos for their household"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'recipe-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT household_id::text
    FROM household_members
    WHERE user_id = auth.uid()
  )
);
```

### Policy 2: Allow public read access to all photos

```sql
CREATE POLICY "Anyone can view recipe photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'recipe-photos');
```

### Policy 3: Allow users to update photos in their household

```sql
CREATE POLICY "Users can update photos for their household"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'recipe-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT household_id::text
    FROM household_members
    WHERE user_id = auth.uid()
  )
);
```

### Policy 4: Allow users to delete photos in their household

```sql
CREATE POLICY "Users can delete photos for their household"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'recipe-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT household_id::text
    FROM household_members
    WHERE user_id = auth.uid()
  )
);
```

## Step 3: Verify Setup

1. Test uploading a photo through the app by:
   - Creating or editing a recipe
   - Clicking the photo upload area
   - Selecting an image file
2. Check the browser console for upload confirmation: `✅ Uploaded recipe photo: [url]`
3. Verify the photo appears in the Supabase Storage bucket under your household ID folder

## Storage Organization

Photos are organized by household:
```
recipe-photos/
  └── {household-id}/
      ├── {recipe-id}.jpg
      ├── {recipe-id}.png
      └── ...
```

Each household's photos are stored in their own folder, and the `upsert: true` option ensures that uploading a new photo for the same recipe replaces the old one.

## Features

- **Automatic compression**: Images are compressed to ~85% quality and max 1200px width
- **Drag & drop**: Users can drag images onto the upload area
- **Preview**: Uploaded images show a preview with remove button
- **File validation**: Only image files under 10MB are accepted
- **Overwrite**: Re-uploading a photo for the same recipe replaces the old one

## Troubleshooting

### Upload fails with 403 Forbidden
- Check that the `recipe-photos` bucket exists and is public
- Verify the RLS policies are created correctly
- Ensure the user is authenticated

### Photos don't appear
- Check browser console for errors
- Verify the photo URL is saved in the recipe
- Check Supabase Storage to see if the file was uploaded

### Large images take too long
- Images are automatically compressed before upload
- You can adjust compression settings in `storage.js`:
  - `maxWidth`: Currently 1200px (reduce for smaller files)
  - `quality`: Currently 0.85 (reduce for more compression)
