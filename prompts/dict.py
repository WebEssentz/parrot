def get_user_info_safe():
  user_profile = {
    "username": "alex_codes",
    "user_id": 101,
    "email": "alex@example.com",
    "is_active": True
  }

  # Using .get() will return None if the key doesn't exist,
  # or a default value if you provide one (e.g., "N/A")
  first_name = user_profile.get('first_name', 'Not Provided')
  print(f"First Name: {first_name}")

  # You can also use a try-except block for more complex error handling
  try:
    last_name = user_profile['last_name']
    print(f"Last Name: {last_name}")
  except KeyError:
    print("Last Name key does not exist in user_profile.")

get_user_info_safe()