# Supabase Storage Setup for Photo Uploads

## ❌ Current Issue
The photo upload is failing with "Bucket not found" error. The storage bucket `client-photos` needs to be created in your Supabase dashboard.

## 🔧 Setup Instructions

### 1. Create Storage Bucket (REQUIRED FIRST STEP)
1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Storage** section in the left sidebar
4. Click **"Create a new bucket"**
5. Enter bucket name: `client-photos`
6. Set **Public bucket** to **ON** (this allows photo viewing)
7. Click **"Create bucket"**

### 2. Set Storage Policies (After bucket is created)
Once the bucket exists, create these RLS policies in the **SQL Editor**:

#### Insert Policy (for uploading photos)
```sql
CREATE POLICY "Instructors can upload client photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'client-photos' AND
  auth.role() = 'authenticated'
);
```

#### Select Policy (for viewing photos)
```sql
CREATE POLICY "Anyone can view client photos" ON storage.objects
FOR SELECT USING (bucket_id = 'client-photos');
```

#### Update Policy (for updating photos)
```sql
CREATE POLICY "Instructors can update client photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'client-photos' AND
  auth.role() = 'authenticated'
);
```

#### Delete Policy (for deleting photos)
```sql
CREATE POLICY "Instructors can delete client photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'client-photos' AND
  auth.role() = 'authenticated'
);
```

### 3. Verify Setup
After creating the bucket and policies:
1. Go to **Storage** → **client-photos** bucket
2. You should see the bucket listed
3. Try uploading a photo in the app
4. Check that photos are visible to all users

## Current Status
❌ **Bucket not found** - The `client-photos` bucket needs to be created first before the code can work.

## Next Steps
1. Create the storage bucket as described above
2. Set up the RLS policies
3. Test the photo upload functionality
4. Photos will then be visible to all users across devices 