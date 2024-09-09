import './style.css';
import { formatTime } from './util';
import playlist from './playlist.json';

const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const target = document.body;
target.parentNode.insertBefore(tag, target);

let player;
// 0: No looping, 1: Loop current state, 2: Loop entire playlist
let loopMode = 0;
let currentSpeed = 1;
let intervalId;

document.getElementById('number-of-songs').innerText = `${playlist.length} ${playlist.length > 1 ? 'songs' : 'song'}`;

let currentIndex = 0;

// Expose the onYouTubeIframeAPIReady function globally
window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player('player', {
        height: '390',
        width: '640',
        videoId: getVideoIdFromUrl(),
        playerVars: {
            controls: 0, // Hide the default YouTube player controls.
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
        }
    })
}

function getVideoIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    currentIndex = videoId ? playlist.findIndex(video => video.id === videoId) : 0;
    if (currentIndex === -1) currentIndex = 0;
    return playlist[currentIndex].id;
}

function onPlayerReady(event) {
    window.addEventListener('popstate', handlePopState);

    document.getElementById('playPause').addEventListener('click', playPauseVideo);
    document.getElementById('next').addEventListener('click', nextVideo);
    document.getElementById('prev').addEventListener('click', prevVideo);
    document.getElementById('speed').addEventListener('click', changeSpeed);
    document.getElementById('loop').addEventListener('click', toggleLoop);
    document.getElementById('seekBar').addEventListener('input', seekVideo);

    // Update the slider as the video plays
    setInterval(updateSeekBar, 1000);

    // Initial video duration
    displayVideoDuration();

    renderPlaylist();
}

function handlePopState(event) {
    const videoId = getVideoIdFromUrl();
    player.loadVideoById(videoId);
    renderPlaylist();
}

function renderPlaylist() {
    const playlistElement = document.getElementById('playlist');
    playlistElement.innerHTML = '';
    playlist.forEach((video, index) => {
        const item = document.createElement('a');
        item.className = 'playlist-item';
        item.innerText = video.title;
        item.addEventListener('click', (e) => {
            e.preventDefault();
            playVideoAt(index);
        });

        if (index === currentIndex) {
            item.classList.add('active');
        }

        playlistElement.appendChild(item);
    })
}

function playVideoAt(index) {
    currentIndex = index;
    player.loadVideoById(playlist[currentIndex].id);
    if (intervalId) {
        clearInterval(intervalId);
    }
    renderPlaylist();
    updateQueryString();
}

function updateQueryString() {
    const newUrl = `${window.location.pathname}?v=${playlist[currentIndex].id}`;
    history.pushState({}, '', newUrl);
}

function playPauseVideo() {
    if (player.getPlayerState() === YT.PlayerState.PLAYING) {
        player.pauseVideo();
        document.getElementById('playPause').innerText = 'Play';
    } else {
        player.playVideo();
        document.getElementById('playPause').innerText = 'Pause';
    }
}

function updateSeekBar() {
    const currentTime = player.getCurrentTime();
    const duration = player.getDuration();
    const seekBar = document.getElementById('seekBar');
    const currentTimeEl = document.getElementById('current-time');
    const totalDurationEl = document.getElementById('total-duration')

    // Calculate the percentage of the video that has been played
    const percentage = (currentTime / duration) * 100;
    seekBar.value = percentage;

    // Update time display
    currentTimeEl.innerText = formatTime(currentTime);
    totalDurationEl.innerText = formatTime(duration);
}

function seekVideo(event) {
    // Convert percentage back to time
    const seekTo = (event.target.value / 100) * player.getDuration();
    player.seekTo(seekTo, true); // Seek to the new time
}

function nextVideo() {
    if (loopMode !== 0 || currentIndex < playlist.length - 1) {
        currentIndex = (currentIndex + 1) % playlist.length;
        player.loadVideoById(playlist[currentIndex].id);
        clearInterval(intervalId); // Clear interval when changing video
        renderPlaylist();
        updateQueryString();
    } else {
        console.log('Reached the last video, no further progression in No Loop Mode');
    }
}

function prevVideo() {
    currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    player.loadVideoById(playlist[currentIndex].id);
    clearInterval(intervalId); // Clear interval when changing video
    renderPlaylist();
    updateQueryString();
}

function changeSpeed() {
    currentSpeed = (currentSpeed === 1) ? 1.5 : 1;
    player.setPlaybackRate(currentSpeed);
}

function toggleLoop() {
    loopMode = (loopMode + 1) % 3; // Cycle through 0, 1, 2

    const loopButton = document.getElementById('loop');

    if (loopMode === 0) {
        loopButton.innerText = 'No Looping';
    } else if (loopMode === 1) {
        loopButton.innerText = 'Loop current video';
    } else if (loopMode === 2) {
        loopButton.innerText = 'Loop playlist';
    }
}

function onPlayerStateChange(event) {
    switch (event.data) {
        case YT.PlayerState.PLAYING:
            displayVideoDuration();
            // Clear any existing interval
            if (intervalId) {
                clearInterval(intervalId);
            }

            // Set a new interval
            intervalId = setInterval(updateSeekBar, 1000);

            document.getElementById('playPause').innerText = 'Pause';
            break;
        case YT.PlayerState.PAUSED:
            document.getElementById('playPause').innerText = 'Play';
            break;
        case YT.PlayerState.ENDED:
            if (loopMode === 1) {
                // Loop the current video
                player.playVideo();
            } else if (loopMode === 2 && currentIndex < playlist.length - 1) {
                // Loop the entire playlist if not at the last video
                nextVideo();
            } else if (loopMode === 2 && currentIndex === playlist.length - 1) {
                // Loop back to the first video when the last video ends
                currentIndex = 0;
                player.loadVideoById(playlist[currentIndex].id);
            } else if (loopMode === 0 && currentIndex < playlist.length - 1) {
                // No looping, but move to the next video in the playlist
                nextVideo();
            } else if (loopMode === 0 && currentIndex === playlist.length - 1) {
                console.log('Playlist ended, no looping');
            }
    
            // Stop updating when video ends
            clearInterval(intervalId);

            document.getElementById('playPause').innerText = 'Play';
            break;
    }
}

function displayVideoDuration() {
  document.getElementById('total-duration').innerText = formatTime(player.getDuration());
}