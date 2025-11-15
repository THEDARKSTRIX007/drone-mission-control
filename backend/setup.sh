#!/bin/bash
# Setup script to install dependencies for the backend project

echo "Installing system dependencies..."
sudo apt update
sudo apt install -y python3-pip python3-venv

echo "Creating virtual environment..."
python3 -m venv venv

echo "Activating virtual environment and installing Python packages..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "Setup complete! To activate the virtual environment, run:"
echo "  source venv/bin/activate"

