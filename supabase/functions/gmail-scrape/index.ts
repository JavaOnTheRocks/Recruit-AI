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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the user's session to access their Google OAuth token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('User error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Please sign in with Google.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the user's identity to find the Google provider token
    const googleIdentity = user.identities?.find(id => id.provider === 'google');
    
    if (!googleIdentity) {
      return new Response(
        JSON.stringify({ 
          error: 'Google account not linked',
          requiresGoogleAuth: true,
          message: 'Please sign in with Google to access your emails.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the session to access the provider token
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    
    if (sessionError || !session?.provider_token) {
      console.error('Session error:', sessionError);
      return new Response(
        JSON.stringify({ 
          error: 'Gmail access token not available',
          requiresGoogleAuth: true,
          message: 'Please re-authenticate with Google to grant Gmail access.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = session.provider_token;

    // Search for emails with attachments (PDFs, DOCs) from the last 30 days
    const searchQuery = 'has:attachment (filename:pdf OR filename:doc OR filename:docx) newer_than:30d';
    const searchUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(searchQuery)}&maxResults=20`;

    console.log('Searching Gmail with query:', searchQuery);

    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('Gmail search error:', errorText);
      
      if (searchResponse.status === 401) {
        return new Response(
          JSON.stringify({ 
            error: 'Gmail access expired',
            requiresGoogleAuth: true,
            message: 'Your Gmail access has expired. Please sign in with Google again.'
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to search Gmail', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchData = await searchResponse.json();
    const messages = searchData.messages || [];
    
    console.log(`Found ${messages.length} messages with attachments`);

    // Fetch details for each message and extract resume attachments
    const resumeAttachments: Array<{
      messageId: string;
      subject: string;
      from: string;
      date: string;
      attachmentId: string;
      filename: string;
      mimeType: string;
      size: number;
    }> = [];

    for (const msg of messages.slice(0, 10)) { // Limit to 10 messages
      const messageUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`;
      
      const messageResponse = await fetch(messageUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!messageResponse.ok) {
        console.error(`Failed to fetch message ${msg.id}`);
        continue;
      }

      const messageData = await messageResponse.json();
      
      // Extract headers
      const headers = messageData.payload?.headers || [];
      const subject = headers.find((h: { name: string }) => h.name === 'Subject')?.value || 'No Subject';
      const from = headers.find((h: { name: string }) => h.name === 'From')?.value || 'Unknown';
      const date = headers.find((h: { name: string }) => h.name === 'Date')?.value || '';

      // Find attachments in parts
      const findAttachments = (parts: any[]): any[] => {
        const attachments: any[] = [];
        for (const part of parts) {
          if (part.filename && part.body?.attachmentId) {
            const filename = part.filename.toLowerCase();
            if (filename.endsWith('.pdf') || filename.endsWith('.doc') || filename.endsWith('.docx')) {
              attachments.push({
                messageId: msg.id,
                subject,
                from,
                date,
                attachmentId: part.body.attachmentId,
                filename: part.filename,
                mimeType: part.mimeType,
                size: parseInt(part.body.size) || 0,
              });
            }
          }
          if (part.parts) {
            attachments.push(...findAttachments(part.parts));
          }
        }
        return attachments;
      };

      if (messageData.payload?.parts) {
        resumeAttachments.push(...findAttachments(messageData.payload.parts));
      }
    }

    console.log(`Found ${resumeAttachments.length} resume attachments`);

    return new Response(
      JSON.stringify({ 
        success: true,
        attachments: resumeAttachments,
        message: `Found ${resumeAttachments.length} potential resume files`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in gmail-scrape function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
