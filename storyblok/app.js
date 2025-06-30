// app.js
(function() {
    // --- Configuration ---
    // IMPORTANT: Replace this with the actual URL of your deployed Netlify Function.
    // For now, it's a placeholder. Example: 'https://your-netlify-site.netlify.app/.netlify/functions/generate-brief'
    const FASTAPI_BACKEND_URL = 'https://musical-croissant-7493c1.netlify.app'; // <<< REMEMBER TO UPDATE THIS LATER!

    // --- DOM Elements ---
    const titleInput = document.getElementById('title');
    const contentTypeInput = document.getElementById('contentType');
    const keywordsInput = document.getElementById('keywords');
    const toneInput = document.getElementById('tone');
    const audienceInput = document.getElementById('audience');
    const additionalNotesInput = document.getElementById('additionalNotes');
    const generateBriefBtn = document.getElementById('generateBriefBtn');
    const loadingIndicator = document.getElementById('loading');
    const errorMessageDiv = document.getElementById('errorMessage');
    const errorTextSpan = document.getElementById('errorText');
    const briefSection = document.getElementById('briefSection');
    const briefOutput = document.getElementById('briefOutput');
    const insertBriefBtn = document.getElementById('insertBriefBtn');

    // Modal elements
    const messageModal = document.getElementById('messageModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalCloseBtn = document.getElementById('modalCloseBtn');

    let fieldPlugin; // To store the Storyblok field plugin instance

    // --- Initialize Storyblok Field Plugin ---
    // This function runs when the Storyblok editor loads the plugin.
    window.Storyblok.init({
        accessToken: 'YOUR_STORYBLOK_PREVIEW_TOKEN' // While not strictly needed for field plugins
                                                  // it's good practice to have.
                                                  // Often inherited by the editor.
    });

    // Listen for the plugin to be ready and get its instance
    window.Storyblok.api.get('plugin:load', function(plugin) {
        fieldPlugin = plugin;

        // Auto-fill content title from Storyblok's story name
        if (fieldPlugin.story && fieldPlugin.story.name) {
            titleInput.value = fieldPlugin.story.name;
        }

        // Set the initial value of the plugin's field
        // If the brief was previously generated and saved, load it
        fieldPlugin.set(fieldPlugin.field);

        // Listen for changes to the plugin's field from Storyblok
        // This is useful if the field is updated by other means
        fieldPlugin.on('change', function(event) {
            // Update the briefOutput if the field changes outside this plugin
            briefOutput.textContent = event.field || '';
            if (briefOutput.textContent) {
                briefSection.classList.remove('hidden');
            }
        });

        // Event listener for the Generate Brief button
        generateBriefBtn.addEventListener('click', generateBrief);

        // Event listener for the Insert Brief button
        insertBriefBtn.addEventListener('click', insertBrief);

        // Event listener for closing the custom modal
        modalCloseBtn.addEventListener('click', hideModal);

        // Initial setup for the brief output area
        // If there's an existing brief in the field, display it
        if (fieldPlugin.field) {
            briefOutput.textContent = fieldPlugin.field;
            briefSection.classList.remove('hidden');
        }
    });

    // --- Function to Display Custom Modal Message ---
    function showModal(title, message) {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        messageModal.classList.remove('hidden');
    }

    // --- Function to Hide Custom Modal Message ---
    function hideModal() {
        messageModal.classList.add('hidden');
    }

    // --- Function to Display Errors (within the plugin UI) ---
    function showError(message) {
        errorTextSpan.textContent = message;
        errorMessageDiv.classList.remove('hidden');
    }

    // --- Function to Hide Errors ---
    function hideError() {
        errorMessageDiv.classList.add('hidden');
        errorTextSpan.textContent = '';
    }

    // --- Function to Toggle Loading State ---
    function toggleLoading(isLoading) {
        if (isLoading) {
            loadingIndicator.classList.remove('hidden');
            generateBriefBtn.disabled = true;
            insertBriefBtn.disabled = true;
            hideError(); // Always hide previous errors when loading
        } else {
            loadingIndicator.classList.add('hidden');
            generateBriefBtn.disabled = false;
            insertBriefBtn.disabled = false;
        }
    }

    // --- Function to Generate the Brief ---
    async function generateBrief() {
        toggleLoading(true);
        hideError(); // Hide any previous errors

        // Gather input from the form fields
        const requestBody = {
            title: titleInput.value,
            content_type: contentTypeInput.value || 'blog post',
            keywords: keywordsInput.value.split(',').map(k => k.trim()).filter(k => k),
            tone: toneInput.value || 'informative and professional',
            audience: audienceInput.value || 'general audience interested in the topic',
            additional_notes: additionalNotesInput.value || ''
        };

        try {
            // Make the API call to your Netlify Function backend
            const response = await fetch(`${FASTAPI_BACKEND_URL}`, { // Note: No /generate-brief path for Netlify Functions
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const brief = data.brief;

            // Display the generated brief
            briefOutput.textContent = brief;
            briefSection.classList.remove('hidden');

            // Set the generated brief as the internal field value for Storyblok
            // The editor can then explicitly save the story.
            fieldPlugin.set(brief);

        } catch (error) {
            console.error('Error generating brief:', error);
            showError(`Failed to generate brief: ${error.message}`);
            briefSection.classList.add('hidden'); // Hide brief section on error
        } finally {
            toggleLoading(false);
        }
    }

    // --- Function to Insert the Brief into the Storyblok Field ---
    function insertBrief() {
        if (fieldPlugin && briefOutput.textContent) {
            // This explicitly tells Storyblok to set the current field's value
            // with the content of briefOutput.
            fieldPlugin.set(briefOutput.textContent);
            fieldPlugin.emit('change', fieldPlugin.field); // Notify Storyblok of the change
            fieldPlugin.emit('input', fieldPlugin.field); // Also emit input for real-time updates
            showModal('Brief Inserted!', 'The brief has been inserted into the field. Remember to save your Storyblok entry to persist changes.');
        } else {
            showError('No brief to insert. Please generate one first.');
        }
    }

})(); // End of IIFE (Immediately Invoked Function Expression)
