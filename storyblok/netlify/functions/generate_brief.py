# netlify/functions/generate-brief.py
import json
import os
import httpx

# Get Gemini API key from environment variables (set this in Netlify UI!)
GEMINI_API_KEY = "AIzaSyDlD7pdATtZa7NBfhKm7H2_NRUjNXMs8ug"
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

async def handler(event, context):
    """
    Netlify Function handler for generating content briefs.
    """
    try:
        if event["httpMethod"] != "POST":
            return {
                "statusCode": 405,
                "body": json.dumps({"detail": "Method Not Allowed"}),
                "headers": {"Content-Type": "application/json"}
            }

        body = json.loads(event["body"])

        # Extract data from the request body, provide defaults
        title = body.get("title", "Untitled Content")
        content_type = body.get("content_type", "blog post")
        keywords = body.get("keywords", [])
        tone = body.get("tone", "informative and professional")
        audience = body.get("audience", "general audience interested in the topic")
        additional_notes = body.get("additional_notes", "")

        # Construct the prompt for the Gemini model
        prompt = f"""
        You are an expert content strategist and AI assistant tasked with generating comprehensive content briefs.
        Generate a detailed content brief for a {content_type} titled "{title}".

        Include the following sections:

        1.  **Topic/Title:** "{title}"
        2.  **Content Type:** {content_type}
        3.  **Target Audience:** {audience}
        4.  **Key Keywords:** {', '.join(keywords) if keywords else 'No specific keywords provided, suggest relevant ones.'}
        5.  **Purpose/Goal:** What should the content achieve (e.g., inform, entertain, convert, educate)?
        6.  **Key Takeaways/Main Points:** List 3-5 essential points the audience should remember.
        7.  **Structure/Outline:** Suggest a logical flow (e.g., Introduction, H2 sections, Conclusion).
        8.  **Call to Action (if applicable):** What action should the reader take?
        9.  **Tone of Voice:** {tone}
        10. **Word Count Estimate:** Provide a reasonable range (e.g., 800-1200 words).
        11. **SEO Considerations:** Briefly mention any on-page SEO best practices.

        Additional Notes/Context: {additional_notes if additional_notes else 'None.'}

        Ensure the brief is clear, concise, and actionable for a content editor.
        """

        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}]
        }

        # Make the asynchronous HTTP POST request to the Gemini API
        # Using httpx for async requests, install it via requirements.txt
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{GEMINI_API_URL}?key={GEMINI_API_KEY}",
                json=payload,
                timeout=60.0
            )
            response.raise_for_status()

        gemini_result = response.json()

        generated_brief = ""
        if (gemini_result.get("candidates") and
                len(gemini_result["candidates"]) > 0 and
                gemini_result["candidates"][0].get("content") and
                gemini_result["candidates"][0]["content"].get("parts") and
                len(gemini_result["candidates"][0]["content"]["parts"]) > 0):
            generated_brief = gemini_result["candidates"][0]["content"]["parts"][0]["text"]
        else:
            raise Exception("Gemini API did not return expected content.")

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                # Allow CORS from Storyblok editor
                "Access-Control-Allow-Origin": "*", # Replace with Storyblok domain in production
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            "body": json.dumps({"brief": generated_brief})
        }

    except Exception as e:
        print(f"Error: {e}") # Log error for debugging in Netlify logs
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            "body": json.dumps({"detail": str(e)})
        }