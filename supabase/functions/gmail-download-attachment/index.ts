import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messageId, attachmentId, filename, projectId } = await req.json();

    if (!messageId || !attachmentId || !filename || !projectId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the session to access the provider token
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    
    if (sessionError || !session?.provider_token) {
      return new Response(
        JSON.stringify({ error: 'Gmail access not available' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = session.provider_token;

    // Download the attachment from Gmail
    const attachmentUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`;
    
    console.log(`Downloading attachment: ${filename}`);

    const attachmentResponse = await fetch(attachmentUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!attachmentResponse.ok) {
      const errorText = await attachmentResponse.text();
      console.error('Failed to download attachment:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to download attachment from Gmail' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const attachmentData = await attachmentResponse.json();
    
    // The attachment data is base64 URL-safe encoded
    const base64Data = attachmentData.data.replace(/-/g, '+').replace(/_/g, '/');
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Upload to Supabase Storage
    const timestamp = Date.now();
    const storagePath = `${projectId}/${timestamp}_${filename}`;

    // Determine MIME type
    let mimeType = 'application/octet-stream';
    if (filename.toLowerCase().endsWith('.pdf')) {
      mimeType = 'application/pdf';
    } else if (filename.toLowerCase().endsWith('.doc')) {
      mimeType = 'application/msword';
    } else if (filename.toLowerCase().endsWith('.docx')) {
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    const { error: uploadError } = await supabaseClient.storage
      .from('resumes')
      .upload(storagePath, binaryData, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload file to storage', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the public URL
    const { data: urlData } = supabaseClient.storage
      .from('resumes')
      .getPublicUrl(storagePath);

    console.log(`Successfully uploaded ${filename} to ${storagePath}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        filename,
        storagePath,
        url: urlData.publicUrl,
        size: binaryData.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in gmail-download-attachment function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
