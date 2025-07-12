# Dockerfile

# --- Stage 1: The Builder ---
# This stage installs dependencies into a temporary image.
# Using a multi-stage build makes our final image much smaller and more secure.
FROM python:3.11-slim as builder

# Set the working directory inside the container
WORKDIR /app

# Upgrade pip and install dependencies
# We copy requirements.txt first to take advantage of Docker's layer caching.
# This layer only rebuilds if your dependencies change, making future builds faster.
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install --user -r requirements.txt

# --- Stage 2: The Final Image ---
# This is the lean, final image that will actually run in production.
FROM python:3.11-slim

WORKDIR /app

# Copy the installed packages from the 'builder' stage
COPY --from=builder /root/.local /root/.local

# Add the packages to the system's PATH.
# This ensures that our Python script can find the installed libraries.
ENV PATH=/root/.local/bin:$PATH

# Copy the rest of the application source code
COPY . .

# Define the command that will run when the container starts
# This executes your agent's entrypoint.
CMD ["python", "-m", "src.agent_session.main"]