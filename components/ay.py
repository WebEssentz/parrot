# Generated with 💚 by Avurna AI (2025)
# For educational/demo use. Review before production.
import random

# Hangman stages (visuals)
hangman_stages = [
    """
       +---+
           |
           |
           |
           |
           |
    =========""",
    """
       +---+
       O   |
           |
           |
           |
           |
    =========""",
    """
       +---+
       O   |
       |   |
           |
           |
           |
    =========""",
    """
       +---+
       O   |
      /|   |
           |
           |
           |
    =========""",
    """
       +---+
       O   |
      /|\\  |
           |
           |
           |
    =========""",
    """
       +---+
       O   |
      /|\\  |
      /    |
           |
           |
    =========""",
    """
       +---+
       O   |
      /|\\  |
      / \\  |
           |
           |
    =========""",
]

# Word categories
word_categories = {
    "animals": ["dog", "cat", "bird", "fish", "lion", "tiger", "elephant", "monkey"],
    "fruits": ["apple", "banana", "orange", "grape", "mango", "strawberry", "kiwi"],
    "countries": ["usa", "canada", "france", "japan", "brazil", "australia", "italy"],
}

def choose_word(category, difficulty):
    """
    Chooses a random word from a category, adjusting for difficulty.
    """
    if category not in word_categories:
        return "avocado"  # Default word if category is invalid

    words = word_categories[category]
    if difficulty == "medium":
        words = [word for word in words if 4 <= len(word) <= 7]  # Medium length words
    elif difficulty == "hard":
        words = [word for word in words if len(word) > 7]  # Long words
    return random.choice(words).upper()

def display_word(word, guessed_letters):
    """
    Displays the word with blanks for unguessed letters.
    """
    displayed_word = ""
    for letter in word:
        if letter in guessed_letters:
            displayed_word += letter + " "
        else:
            displayed_word += "_ "
    return displayed_word

def get_hint(word, guessed_letters):
    """
    Provides a hint (reveals a letter).
    """
    for letter in word:
        if letter not in guessed_letters:
            return f"The word contains the letter '{letter}'."
    return "No more hints available!"  # No more hints

def hangman():
    """
    Plays the Hangman game!
    """
    print("Let's play Hangman! 🥳")

    # Choose difficulty
    difficulty = input("Choose difficulty (easy, medium, hard): ").lower()
    while difficulty not in ["easy", "medium", "hard"]:
        difficulty = input("Invalid difficulty. Choose again (easy, medium, hard): ").lower()

    # Choose category
    print("Choose a category:")
    for category in word_categories:
        print(f"- {category}")
    category = input().lower()
    while category not in word_categories:
        print("Invalid category. Choose again.")
        for cat in word_categories:
            print(f"- {cat}")
        category = input().lower()

    word_to_guess = choose_word(category, difficulty)
    guessed_letters = set()
    lives = 6
    hints_used = 0  # Track hints

    print(display_word(word_to_guess, guessed_letters))

    while lives > 0:
        print(hangman_stages[6 - lives])  # Display the hangman figure
        print(f"You have {lives} lives left. Guess a letter!")
        guess = input().upper()

        if not guess.isalpha() or len(guess) != 1:
            print("Please enter a single letter, silly! 😜")
            continue

        if guess in guessed_letters:
            print("You already guessed that letter! Try again! 🙄")
            continue

        guessed_letters.add(guess)

        if guess in word_to_guess:
            print("Yay! That letter is in the word! 🎉")
        else:
            lives -= 1
            print("Nope! That letter is not in the word. 😔")

        print(display_word(word_to_guess, guessed_letters))

        if "_" not in display_word(word_to_guess, guessed_letters):
            print("You win! You guessed the word! 🥳")
            break

        # Hint option
        if hints_used < 1 and lives > 1:  # Only one hint allowed
            use_hint = input("Need a hint? (yes/no): ").lower()
            if use_hint == "yes":
                print(get_hint(word_to_guess, guessed_letters))
                hints_used += 1

    if lives == 0:
        print(hangman_stages[6])  # Display the final hangman figure
        print(f"You ran out of lives! The word was {word_to_guess}. 😭")

# Let's play!
hangman()