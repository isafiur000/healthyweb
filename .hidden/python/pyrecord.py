import os
import sys
import time
import wave
import threading
import pyaudio

# Define your folder path
folder_path = sys.argv[1]

# Create the folder if it doesn't exist
os.makedirs(folder_path, exist_ok=True)

# Audio Configuration
FORMAT = pyaudio.paInt16      # 16-bit resolution
CHANNELS = 1                  # Mono recording
RATE = 44100                  # 44.1kHz sampling rate (CD quality)
CHUNK = 1024                  # Samples per buffer read
SEGMENT_DURATION = 15         # Split files every 30 seconds

# Calculate how many chunk reads equal 30 seconds
CHUNKS_PER_SEGMENT = int((RATE / CHUNK) * SEGMENT_DURATION)

def save_audio_file(filename, frames, sample_width):
    """Saves the collected audio frames into a WAV file in the background."""
    print(f"[Saving] {filename}...")
    with wave.open(filename, 'wb') as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(sample_width)
        wf.setframerate(RATE)
        wf.writeframes(b''.join(frames))
    print(f"[Saved] {filename}")

def continuous_recorder():
    p = pyaudio.PyAudio()
    
    # Open the microphone stream
    stream = p.open(
        format=FORMAT,
        channels=CHANNELS,
        rate=RATE,
        input=True,
        frames_per_buffer=CHUNK
    )
    
    print("🎤 Continuous recording started... Press Ctrl+C to stop.")
    
    try:
        sample_width = p.get_sample_size(FORMAT)
        segment_count = 1
        frames = []
        chunk_counter = 0

        while True:
            # Read raw audio data from the microphone
            data = stream.read(CHUNK, exception_on_overflow=False)
            frames.append(data)
            chunk_counter += 1

            # Once we reach 30 seconds worth of chunks, save and reset
            if chunk_counter >= CHUNKS_PER_SEGMENT:
                filename = os.path.join(folder_path, f"recording_{segment_count}_{int(time.time())}.wav")
                
                # Spin off a thread to write the file so the loop doesn't pause/hiccup
                save_thread = threading.Thread(
                    target=save_audio_file, 
                    args=(filename, frames, sample_width)
                )
                save_thread.start()
                
                # Reset counters for the next 30-second block
                frames = []
                chunk_counter = 0
                segment_count += 1

    except KeyboardInterrupt:
        print("\nStopping recording gracefully...")
    finally:
        # Clean up audio stream resources safely
        stream.stop_stream()
        stream.close()
        p.terminate()

        # Save any leftover trailing frames if the user exits mid-segment
        if frames:
            filename = filename = os.path.join(folder_path, f"recording_{segment_count}_final.wav")
            save_audio_file(filename, frames, sample_width)
        print("Recording stopped.")

if __name__ == "__main__":
    continuous_recorder()

