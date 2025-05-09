#!/usr/bin/env python3
import serial
import time
import sys
import zlib
import serial.tools.list_ports
import os
from PIL import Image

# These should be set according to your environment
CHUNK_SIZE = 512
BAUD_RATE = 115200  # Change this to your baud rate
TIMEOUT = 2
MAX_RETRIES = 3
SERIAL_PORT = None


# Functions for Image Upload
def send_line(ser, line):
    ser.write((line + '\n').encode())

def wait_for_response(ser: serial.Serial, expected, timeout=2.0):
    start = time.time()
    while time.time() - start < timeout:
        if ser.in_waiting:
            data = ser.readline()
            print("Raw data:", data)
            line = data.decode().removesuffix('\r\n').strip()
            print("Received:", line.encode())
            if expected in line:
                print("✅ Response received:", line)
                return True
            elif line == "CHUNK_FAIL":
                return False
            elif line == "UPLOAD_CANCELED":
                return False
    print("Timeout waiting for response:", expected)
    return False

def wait_for_ready(ser, timeout=5.0):
    print("Waiting for device READY...")
    start = time.time()
    while time.time() - start < timeout:
        if ser.in_waiting:
            line = ser.readline().decode().strip()
            if line == "READY":
                print("Device is ready for upload.")
                return True
    print("Device did not respond with READY.")
    return False

def upload_image(path):
    if not os.path.exists(path):
        print("File not found:", path)
        return

    total_size = os.path.getsize(path)
    print(f"Uploading '{path}' ({total_size} bytes)")

    with open(path, "rb") as f:
        ser = serial.Serial(SERIAL_PORT, baudrate=BAUD_RATE, timeout=TIMEOUT)
        # Turn off DTR and RTS
        ser.setDTR(False)
        ser.setRTS(True)
        time.sleep(0.05)
        ser.setRTS(False)

        time.sleep(3)  # Give device time to boot/reset
        
        send_line(ser, f"IMAGE_UPLOAD:{total_size}")
        if not wait_for_ready(ser):
            print("❌ Upload failed: device not ready")
            return

        timestart = time.time()

        offset = 0
        while offset < total_size:
            chunk = f.read(CHUNK_SIZE)
            data_len = len(chunk)
            crc32 = zlib.crc32(chunk) & 0xFFFFFFFF
            header = f"{offset},{data_len},{crc32:08X}"

            for attempt in range(MAX_RETRIES):
                send_line(ser, f"CHUNK:{header}")
                if not wait_for_response(ser, "CHUNK_START"):
                    print("❌ Device not ready for chunk:", header)
                    break
                
                ser.write(chunk)
                if wait_for_response(ser, "CHUNK_OK"):
                    print(f"✅ Sent chunk @ {offset} ({data_len} bytes)")
                    break
                else:
                    print(f"⚠️ CRC mismatch, retrying chunk @ {offset} (Attempt {attempt + 1})")

            else:
                print(f"❌ Failed to send chunk @ {offset} after {MAX_RETRIES} attempts, aborting.")
                send_line(ser, "UPLOAD_ABORT")
                return

            offset += data_len

        print("Time taken for upload:", time.time() - timestart)

        print("✅ Upload complete!")


# Functions for Image Checks
def is_baseline_jpeg(image_path):
    """
    Checks if the image file at the given path is a baseline JPEG.

    Args:
        image_path (str): The path to the image file.

    Returns:
        bool: True if the image is a baseline JPEG, False otherwise
              (e.g., progressive JPEG, not a JPEG, or an error occurred).
    """
    if not os.path.exists(image_path):
        # Error printed in check_image_requirements
        print(f"Warning: File not found at {image_path}")
        return False

    try:
        img = Image.open(image_path)

        # Check if the format is JPEG
        if img.format != 'JPEG':
            # print(f"Info (is_baseline_jpeg): File is not a JPEG: {image_path}") # Avoid noise, handled in main check
            return False

        # Pillow's info dictionary contains 'progressive' for progressive JPEGs
        return 'progressive' not in img.info or not img.info['progressive']

    except FileNotFoundError:
        # Covered by os.path.exists check before calling this function,
        # but included for safety if called standalone.
        print(f"Error (is_baseline_jpeg): File not found at {image_path}")
        return False
    except Exception as e:
        print(f"Error (is_baseline_jpeg): Could not process image header for {image_path} - {e}")
        return False

def has_dimensions(image_path, expected_width, expected_height):
    """
    Checks if the image file at the given path has the specified dimensions.

    Args:
        image_path (str): The path to the image file.
        expected_width (int): The expected width in pixels.
        expected_height (int): The expected height in pixels.

    Returns:
        bool: True if the image has the expected dimensions, False otherwise
              (e.g., file not found, not an image, or wrong dimensions).
    """
    if not os.path.exists(image_path):
        # Error printed in check_image_requirements
        return False

    try:
        img = Image.open(image_path)
        actual_size = img.size
        img.close() # Close the image after getting size
        return actual_size == (expected_width, expected_height)
    except FileNotFoundError:
         # Covered by os.path.exists
        print(f"Error (has_dimensions): File not found at {image_path}")
        return False
    except Exception as e:
        print(f"Error (has_dimensions): Could not read image dimensions for {image_path} - {e}")
        return False

def is_file_size_less_than(file_path, max_kilobytes):
    """
    Checks if the file size at the given path is less than the specified limit in kilobytes.

    Args:
        file_path (str): The path to the file.
        max_kilobytes (int): The maximum allowed file size in kilobytes.

    Returns:
        bool: True if the file size is less than the limit, False otherwise
              (e.g., file not found or size exceeds limit).
    """
    if not os.path.exists(file_path):
        # Error printed in check_image_requirements
        return False

    try:
        file_size_bytes = os.path.getsize(file_path)
        file_size_kb = file_size_bytes / 1024.0
        return file_size_kb < max_kilobytes
    except FileNotFoundError:
         # Covered by os.path.exists
        print(f"Error (is_file_size_less_than): File not found at {file_path}")
        return False
    except Exception as e:
        print(f"Error (is_file_size_less_than): Could not get file size for {file_path} - {e}")
        return False

def check_image_requirements(image_path):
    """
    Checks if an image is a baseline JPEG, has dimensions 240x320,
    and a file size less than 50KB, printing warnings for failed checks.

    Args:
        image_path (str): The path to the image file.

    Returns:
        dict: A dictionary containing the results of the checks.
    """
    results = {
        "exists": False,
        "is_jpeg": False,
        "is_baseline": False,
        "has_dimensions_240x320": False,
        "is_less_than_50kb": False,
        "all_requirements_met": False
    }

    print(f"Checking Image for: {image_path}")

    if not os.path.exists(image_path):
        print(f"Warning: File not found at {image_path}")
        return results
    results["exists"] = True # File exists

    # Perform checks
    # Check 1: Is it a JPEG?
    try:
        img = Image.open(image_path)
        results["is_jpeg"] = (img.format == 'JPEG')
        img.close() # Close the image immediately after format check
    except Exception as e:
        print(f"Warning: Could not open image to determine format: {e}")
        # results["is_jpeg"] remains False
        # Cannot proceed with other image-specific checks if format check fails

    if not results["is_jpeg"]:
         print(f"Warning: File is not a JPEG.")
    else:
        # If it's a JPEG, perform the other checks
        # Check 2: Is it baseline JPEG?
        results["is_baseline"] = is_baseline_jpeg(image_path)
        if not results["is_baseline"]:
            print(f"Warning: JPEG is not baseline (likely progressive).")

        # Check 3: Has dimensions 240x320?
        expected_width, expected_height = 240, 320
        results["has_dimensions_240x320"] = has_dimensions(image_path, expected_width, expected_height)
        if not results["has_dimensions_240x320"]:
             # Re-open briefly to get actual size for the warning message
             try:
                 img_dim_check = Image.open(image_path)
                 actual_width, actual_height = img_dim_check.size
                 print(f"Warning: Dimensions are not {expected_width}x{expected_height}. Found {actual_width}x{actual_height}.")
                 img_dim_check.close()
             except Exception:
                 # If getting actual dimensions fails, just print a generic warning
                 print(f"Warning: Dimensions are not {expected_width}x{expected_height}.")


    # Check 4: Is file size less than 50KB?
    max_kb = 55
    results["is_less_than_50kb"] = is_file_size_less_than(image_path, max_kb)
    if not results["is_less_than_50kb"]:
         # Get actual size for the warning message
         try:
             file_size_bytes = os.path.getsize(image_path)
             file_size_kb = file_size_bytes / 1024.0
             print(f"Warning: File size ({file_size_kb:.2f} KB) is not less than {max_kb} KB.")
         except Exception:
              # If getting actual size fails, just print a generic warning
              print(f"Warning: File size is not less than {max_kb} KB.")


    # Determine if all requirements are met
    results["all_requirements_met"] = (
        results["exists"] and
        results["is_jpeg"] and
        results["is_baseline"] and
        results["has_dimensions_240x320"] and
        results["is_less_than_50kb"]
    )
    print("Results: " + str(results))
    if results["all_requirements_met"]:
        return True
    else:
        return False
    print("-" * 20) # Separator for clarity

# Function to send data over serial
def send_serial_data(serial_port, data, timeout=1):
    """
    Send data over a serial connection
    Args:
    data (str or bytes): Data to send
    timeout (float): Serial connection timeout in seconds
    Returns:
    bool: True if successful, False otherwise
    """
    port = serial_port
    baud_rate = BAUD_RATE
    try:
        # Initialize serial connection
        ser = serial.Serial(
            port=port,
            baudrate=baud_rate,
            timeout=timeout,
            bytesize=serial.EIGHTBITS,
            parity=serial.PARITY_NONE,
            stopbits=serial.STOPBITS_ONE
        )
        # Wait for connection to establish
        time.sleep(2)
        # Check if connection is open
        if ser.is_open:
            print(f"Connected to {port} at {baud_rate} baud")
            # Convert string to bytes if needed
            if isinstance(data, str):
                data = data.encode('utf-8')
            # Send the data
            bytes_sent = ser.write(data)
            print(f"Sent {bytes_sent} bytes: {data}")
            # Optional: Read response
            # response = ser.readline()
            # print(f"Received: {response.decode('utf-8').strip()}")
            # Close the connection
            ser.close()
            print("Connection closed")
            return True
    except serial.SerialException as e:
        print(f"Error opening serial port: {e}")
        return False
    except Exception as e:
        print(f"An error occurred: {e}")
        return False

# Function to check command-line arguments
def check_arg_n_run_cmd(port):
    # Check if the correct number of arguments are provided
    if len(sys.argv) == 1:
        return send_serial_data(port, "IDLE")
    elif len(sys.argv) == 2:
        image_path = sys.argv[1]
        if (check_image_requirements(image_path) == False):
            print("Image requirements not met. Please check the image is of following types: \n" \
            "1. Baseline JPEG\n" \
            "2. Dimensions 240x320\n" \
            "3. File size less than 50KB\n")
            return False
        upload_image(image_path)
        return 
    elif len(sys.argv) != 3:
        print("Usage: python test.py <amount> <qr_string>")
        print("Example: python qr_only.py 123456.11 000201010212153137910524005204460000000NBQM:29226400011fonepay.com.np0104NBQM020329206061367695204541153035245402145802NP5911test6008District62210703292021098418456336304")
        return False
    
    # Get the amount and QR string from command-line arguments
    amount = sys.argv[1]
    qr_string = sys.argv[2]
    
    # Format the data as in your example
    formatted_data = f'QR**Rs. {amount}**{qr_string}'
    
    # Send the data
    return send_serial_data(port, formatted_data)

# Function to find all CH341 devices
def find_all_ch341_devices():
    """
    Finds all connected devices that match the CH341 Vendor and Product IDs
    and returns a list of their port information.

    Returns:
        list: A list of dictionaries, where each dictionary contains
              information about a detected CH341 device (port, description, hwid, vid, pid).
              Returns an empty list if no CH341 devices are found.
    """
    # Vendor ID for QinHeng Electronics (commonly used for CH34x chips)
    ch341_vid = 0x1a86
    # Common Product IDs for CH341 in serial mode
    ch341_pids = [0x7523, 0x5523]

    found_devices = []
    print("Searching for CH341 devices...")

    ports = serial.tools.list_ports.comports()

    for port in ports:
        # Check if the port is a USB device and matches the CH341 VID and any of the PIDs
        if port.vid is not None and port.pid is not None and \
           port.vid == ch341_vid and port.pid in ch341_pids:

            device_info = {
                "port": port.device,
                "description": port.description,
                "hwid": port.hwid,
                "vid": hex(port.vid), # Convert to hex for display
                "pid": hex(port.pid)  # Convert to hex for display
            }
            found_devices.append(device_info)

    return found_devices


# Main function to run the script
if __name__ == "__main__":
    print("------------ USE GUIDE -------------")
    print("1. To upload an image, run: python qr_only.py <image_path>")
    print("2. To send a QR code, run: python qr_only.py <amount> <qr_string>")
    print("3. To get idle screen, run: python qr_only.py")
    print("Eg:")
    print("2. python qr_only.py 123456.11 000201010212153137910524005204460000000NBQM:29226400011fonepay.com.np0104NBQM020329206061367695204541153035245402145802NP5911test6008District622107032920210984184563363304")
    print("3. python qr_only.py '/Users/UserName/Downloads/Frame1.jpg'")
    print("----------------- END OF GUIDE ----------------\n\n")

    ch341_devices = find_all_ch341_devices()
    no_of_ch341_devices = len(ch341_devices)


    if (no_of_ch341_devices == 1):
        for i, device in enumerate(ch341_devices):
            print(f"  Port: {device['port']}\n")
            SERIAL_PORT = device['port']
            check_arg_n_run_cmd(SERIAL_PORT)

    elif (no_of_ch341_devices > 1):
        print(f"Found {len(ch341_devices)} CH341 device(s), please check and connect only one device at a time.")

    else:
        print("No CH341 devices found. Check if device is connected or not?")
        sys.exit(1)
