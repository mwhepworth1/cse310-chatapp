// script.js

let pollOptionCount = 2;

function togglePollPopup() {
    const pollPopup = document.getElementById('poll-popup');
    pollPopup.style.display = pollPopup.style.display === 'block' ? 'none' : 'block';
}

function addPollOption() {
    if (pollOptionCount < 10) {
        pollOptionCount++;
        const additionalOptions = document.getElementById('additional-options');
        const newOption = document.createElement('input');
        newOption.type = 'text';
        newOption.className = 'poll-option';
        newOption.placeholder = `Option ${pollOptionCount}`;
        additionalOptions.appendChild(newOption);
    }
}

function createPoll() {
    const question = document.getElementById('poll-question').value.trim();
    const options = Array.from(document.getElementsByClassName('poll-option')).map(input => input.value.trim()).filter(option => option !== '');
    if (question && options.length >= 2) {
        const pollElement = document.createElement('div');
        pollElement.className = 'chat-message';

        const userImage = document.createElement('img');
        userImage.src = 'https://placehold.co/512x512';
        pollElement.appendChild(userImage);

        const pollContent = document.createElement('div');
        pollContent.className = 'chat-message-content';

        const usernameElement = document.createElement('div');
        usernameElement.className = 'chat-message-username';
        usernameElement.textContent = 'Default User';
        pollContent.appendChild(usernameElement);

        const questionElement = document.createElement('div');
        questionElement.textContent = `Poll: ${question}`;
        pollContent.appendChild(questionElement);

        const optionsList = document.createElement('ul');
        optionsList.className = 'poll-options';
        options.forEach((option, index) => {
            const optionItem = document.createElement('li');
            const optionInput = document.createElement('input');
            optionInput.type = 'radio';
            optionInput.name = 'poll';
            optionInput.value = option;
            optionInput.id = `option-${index}`;
            optionInput.onclick = () => showSubmitButton(pollElement);
            const optionLabel = document.createElement('label');
            optionLabel.htmlFor = `option-${index}`;
            optionLabel.textContent = option;
            optionItem.appendChild(optionInput);
            optionItem.appendChild(optionLabel);
            optionsList.appendChild(optionItem);
        });
        pollContent.appendChild(optionsList);

        const submitButton = document.createElement('button');
        submitButton.textContent = 'Submit Vote';
        submitButton.style.display = 'none';
        submitButton.onclick = () => submitVote(pollElement, options);
        pollContent.appendChild(submitButton);

        const resultsList = document.createElement('div');
        resultsList.className = 'poll-results';
        pollContent.appendChild(resultsList);

        pollElement.appendChild(pollContent);
        document.getElementById('chat-messages').prepend(pollElement);

        togglePollPopup();
        document.getElementById('poll-question').value = '';
        document.getElementById('additional-options').innerHTML = '';
        pollOptionCount = 2;
    }
}

function showSubmitButton(pollElement) {
    const submitButton = pollElement.querySelector('button');
    submitButton.style.display = 'block';
}

function submitVote(pollElement, options) {
    const selectedOption = pollElement.querySelector('input[name="poll"]:checked').value;
    const resultsList = pollElement.querySelector('.poll-results');
    resultsList.innerHTML = '';
    const totalVotes = 1; // For simplicity, assuming only one vote for now
    options.forEach(option => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        const voteCount = option === selectedOption ? 1 : 0;
        const percentage = (voteCount / totalVotes) * 100;
        progressBar.style.width = `${percentage}%`;
        progressBar.textContent = `${option}: ${voteCount} vote(s)`;
        resultItem.appendChild(progressBar);
        resultsList.appendChild(resultItem);
    });
    resultsList.style.display = 'flex';
    pollElement.querySelector('.poll-options').style.display = 'none';
    pollElement.querySelector('button').style.display = 'none';
}

function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const messageText = messageInput.value.trim();
    if (messageText !== '') {
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';

        const userImage = document.createElement('img');
        userImage.src = 'https://placehold.co/512x512';
        messageElement.appendChild(userImage);

        const messageContent = document.createElement('div');
        messageContent.className = 'chat-message-content';

        const usernameElement = document.createElement('div');
        usernameElement.className = 'chat-message-username';
        usernameElement.textContent = 'Default User';
        messageContent.appendChild(usernameElement);

        const textElement = document.createElement('div');
        textElement.textContent = messageText;
        messageContent.appendChild(textElement);

        messageElement.appendChild(messageContent);
        document.getElementById('chat-messages').prepend(messageElement);
        messageInput.value = '';
    }
}

document.getElementById('message-input').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

function toggleGifPopup() {
    const gifPopup = document.getElementById('gif-popup');
    gifPopup.style.display = gifPopup.style.display === 'block' ? 'none' : 'block';
    if (gifPopup.style.display === 'block') {
        fetchGifs();
    }
}

function fetchGifs() {
    const apiKey = 'YOUR_GIPHY_API_KEY';
    const query = 'funny';
    fetch(`https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${query}&limit=10`)
        .then(response => response.json())
        .then(data => {
            const gifResults = document.getElementById('gif-results');
            gifResults.innerHTML = '';
            data.data.forEach(gif => {
                const img = document.createElement('img');
                img.src = gif.images.fixed_height.url;
                img.onclick = () => selectGif(gif.images.fixed_height.url);
                gifResults.appendChild(img);
            });
        });
}

function selectGif(url) {
    const messageInput = document.getElementById('message-input');
    messageInput.value += ` ${url}`;
    toggleGifPopup();
}

function redirectToProfile() {
    window.location.href = '/profile';
}
