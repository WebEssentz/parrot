# Generated with 💚 by Avurna AI (2025)

import jax
import jax.numpy as jnp
import haiku as hk

### 🧠 Define Your Neural Network with Haiku

# Haiku encourages a functional style. We define our network as a function
# that internally uses hk.Module to manage parameters and state.
# Here, we're creating a simple Multi-Layer Perceptron (MLP).
class MLP(hk.Module):
    def __init__(self, output_size: int, name=None):
        super().__init__(name=name)
        self.output_size = output_size

    def __call__(self, x: jnp.ndarray) -> jnp.ndarray:
        # Define the layers of our MLP
        # hk.Linear is Haiku's equivalent of a dense (fully connected) layer
        x = hk.Linear(256)(x)  # First hidden layer with 256 units
        x = jax.nn.relu(x)     # ReLU activation function
        x = hk.Linear(128)(x)  # Second hidden layer with 128 units
        x = jax.nn.relu(x)     # ReLU activation
        x = hk.Linear(self.output_size)(x) # Output layer
        return x

### 🛠️ Transform Your Network into Callable Functions

# Haiku's `hk.transform` takes your network definition and turns it into
# two pure functions: `init` and `apply`.
# - `init`: Initializes the network's parameters.
# - `apply`: Performs the forward pass given parameters and input.
def forward_fn(x):
    # Instantiate your MLP within this function
    mlp = MLP(output_size=10) # Let's say we have 10 output classes
    return mlp(x)

# Transform the function to get init and apply
transformed_mlp = hk.transform(forward_fn)

### 🚀 Initialize Parameters and Perform a Forward Pass

# JAX operations require a random key for reproducibility, especially for
# parameter initialization.
rng_key = jax.random.PRNGKey(42) # A fixed seed for consistent results

# Create some dummy input data (e.g., a batch of 4 samples, each with 784 features)
dummy_input = jnp.ones([4, 784])

# 1. Initialize the network's parameters
# The `init` function takes a random key and a dummy input to infer shapes.
params = transformed_mlp.init(rng_key, dummy_input)

print("--- Initialized Parameters (a peek) ---")
# You can inspect the structure of the parameters
for module_name, module_params in params.items():
    print(f"Module: {module_name}")
    for param_name, param_value in module_params.items():
        print(f"  {param_name}: {param_value.shape}")
print("-" * 40)

# 2. Perform a forward pass (inference)
# The `apply` function takes the parameters, a random key (if needed by layers like Dropout),
# and the actual input data.
output = transformed_mlp.apply(params, rng_key, dummy_input)

print("\n--- Output Shape ---")
print(f"Output shape: {output.shape}") # Should be (4, 10) for our example
print("-" * 40)

### ✨ Leveraging JAX's Power: JIT and Grad

# The beauty of JAX + Haiku is how easily you can apply JAX's transformations.

# JIT (Just-In-Time Compilation) for speed:
# We can JIT-compile our `apply` function for significant performance gains.
# This compiles the Python code into optimized machine code (e.g., for TPUs!).
jitted_apply = jax.jit(transformed_mlp.apply)
jitted_output = jitted_apply(params, rng_key, dummy_input)
print("\n--- JIT-compiled Output Shape ---")
print(f"JIT-compiled output shape: {jitted_output.shape}")
print("-" * 40)

# Grad (Automatic Differentiation) for training:
# Let's define a simple loss function and then get its gradient.
def loss_fn(params, rng_key, x, labels):
    predictions = transformed_mlp.apply(params, rng_key, x)
    # Simple mean squared error loss for demonstration
    loss = jnp.mean(jnp.square(predictions - labels))
    return loss

# Create some dummy labels
dummy_labels = jnp.zeros([4, 10])

# Get the gradient of the loss with respect to the parameters
# `jax.grad` returns a function that computes the gradient.
grads_fn = jax.grad(loss_fn)
gradients = grads_fn(params, rng_key, dummy_input, dummy_labels)

print("\n--- Gradients (a peek) ---")
# You can inspect the structure of the gradients, which mirrors the parameters
for module_name, module_grads in gradients.items():
    print(f"Module: {module_name}")
    for grad_name, grad_value in module_grads.items():
        print(f"  {grad_name}: {grad_value.shape}")
print("-" * 40)