# Generated with 💚 by Avurna AI (2025)
# For educational/demo use. Please review before production use.

import time # Used for simulating current time and calculating recency

def recommend_short_form_content(
    content_items: list[dict],
    user_preferences: dict,
    current_time_unix: int # A Unix timestamp to calculate content recency
) -> list[dict]:
    """
    A dummy algorithm function to recommend short-form content for a social media platform.

    This function scores content based on a blend of engagement, recency, and user relevance,
    then returns a sorted list of content items. It's a simplified model, but it
    demonstrates the core concepts of a content recommendation system!

    Args:
        content_items (list[dict]): A list of dictionaries, where each dictionary
                                    represents a piece of short-form content.
                                    Each content item should ideally have these keys:
                                    - 'id' (str): Unique identifier for the content.
                                    - 'views' (int): Number of times the content has been viewed.
                                    - 'likes' (int): Number of likes.
                                    - 'comments' (int): Number of comments.
                                    - 'shares' (int): Number of shares.
                                    - 'upload_time_unix' (int): Unix timestamp of when the content was uploaded.
                                    - 'creator_id' (str): Identifier for the content creator.
                                    - 'hashtags' (list[str]): List of hashtags associated with the content.

        user_preferences (dict): A dictionary containing the current user's preferences.
                                 Expected keys:
                                 - 'followed_creators' (list[str]): IDs of creators the user follows.
                                 - 'preferred_hashtags' (list[str]): Hashtags the user has shown interest in.

        current_time_unix (int): The current time as a Unix timestamp. This is crucial
                                 for calculating how "fresh" the content is.

    Returns:
        list[dict]: A new list of content items, sorted in descending order based on
                    their calculated 'relevance_score'. Each content item in the
                    returned list will have this new 'relevance_score' key.
    """

    # --- Configuration: Adjust these weights to fine-tune the algorithm's behavior! ---
    # Higher weights mean that factor has a greater impact on the final score.
    WEIGHT_LIKES = 0.05         # Likes contribute a small amount
    WEIGHT_COMMENTS = 0.10      # Comments are more valuable than likes
    WEIGHT_SHARES = 0.20        # Shares are highly valuable, indicating strong engagement
    WEIGHT_VIEWS = 0.001        # Views contribute, but less than direct engagement
    WEIGHT_RECENCY = 10000      # A significant boost for newer content
    WEIGHT_FOLLOWED_CREATOR = 50 # Strong boost for content from followed accounts
    WEIGHT_PREFERRED_HASHTAG = 10 # Boost per matching preferred hashtag

    scored_content = [] # This list will hold content items with their calculated scores

    for content in content_items:
        # Initialize the score for the current content item
        score = 0.0

        # 1. Calculate Engagement Score
        # We use .get() with a default of 0 to safely handle missing keys
        score += content.get('likes', 0) * WEIGHT_LIKES
        score += content.get('comments', 0) * WEIGHT_COMMENTS
        score += content.get('shares', 0) * WEIGHT_SHARES
        score += content.get('views', 0) * WEIGHT_VIEWS

        # 2. Calculate Recency Score
        upload_time = content.get('upload_time_unix')
        if upload_time is not None:
            # Calculate time difference in seconds
            time_difference_seconds = current_time_unix - upload_time
            # Convert to hours, ensuring it's at least 1 to avoid division by zero
            time_difference_hours = max(1, time_difference_seconds / 3600)
            # The recency score decays as content gets older
            score += WEIGHT_RECENCY / time_difference_hours

        # 3. Calculate User Relevance Score
        # Check if the content creator is among the user's followed creators
        if content.get('creator_id') in user_preferences.get('followed_creators', []):
            score += WEIGHT_FOLLOWED_CREATOR

        # Check for matching hashtags between content and user preferences
        content_hashtags = set(content.get('hashtags', [])) # Convert to set for efficient intersection
        preferred_hashtags = set(user_preferences.get('preferred_hashtags', []))
        matching_hashtags = content_hashtags.intersection(preferred_hashtags)
        score += len(matching_hashtags) * WEIGHT_PREFERRED_HASHTAG # Add score for each match

        # Store the calculated score with the content item
        # We create a copy to avoid modifying the original input list directly
        content_with_score = content.copy()
        content_with_score['relevance_score'] = score
        scored_content.append(content_with_score)

    # Sort the content items by their relevance score in descending order
    # This puts the most relevant content at the top of the list!
    scored_content.sort(key=lambda x: x['relevance_score'], reverse=True)

    return scored_content

# --- Example Usage: Let's see this algorithm in action! ---
# You can copy and paste this entire block into a Python interpreter or a .py file.

# 1. Simulate a list of short-form content items
# In a real application, this data would come from a database or API.
sample_content_data = [
    {
        'id': 'vid_001',
        'views': 150000,
        'likes': 7500,
        'comments': 300,
        'shares': 200,
        'upload_time_unix': 1718000000, # Approx. June 10, 2024, 00:00:00 UTC
        'creator_id': 'tech_guru',
        'hashtags': ['#AI', '#futuretech', '#gadgets']
    },
    {
        'id': 'vid_002',
        'views': 80000,
        'likes': 4000,
        'comments': 150,
        'shares': 80,
        'upload_time_unix': 1718050000, # A bit newer than vid_001
        'creator_id': 'travel_vlogger',
        'hashtags': ['#travel', '#adventure', '#explore']
    },
    {
        'id': 'vid_003',
        'views': 250000,
        'likes': 12000,
        'comments': 600,
        'shares': 400,
        'upload_time_unix': 1717900000, # Older, but very high engagement
        'creator_id': 'comedy_king',
        'hashtags': ['#funny', '#skit', '#lol']
    },
    {
        'id': 'vid_004',
        'views': 2000,
        'likes': 100,
        'comments': 10,
        'shares': 5,
        'upload_time_unix': 1718100000, # Very recent, low initial engagement
        'creator_id': 'tech_guru', # This creator is followed by our sample user!
        'hashtags': ['#AI', '#coding', '#newtech'] # Matches user's preferred hashtags
    },
    {
        'id': 'vid_005',
        'views': 90000,
        'likes': 4500,
        'comments': 200,
        'shares': 100,
        'upload_time_unix': 1718020000,
        'creator_id': 'foodie_chef',
        'hashtags': ['#cooking', '#recipes', '#foodlover']
    }
]

# 2. Define a sample user's preferences
# This would typically come from a user's profile or interaction history.
sample_user_profile = {
    'followed_creators': ['tech_guru', 'foodie_chef'],
    'preferred_hashtags': ['#AI', '#futuretech', '#travel', '#cooking']
}

# 3. Get the current time (as a Unix timestamp)
# In a live system, this would be the actual current time.
current_moment = int(time.time())

# 4. Run the recommendation algorithm!
recommended_feed_for_user = recommend_short_form_content(
    content_items=sample_content_data,
    user_preferences=sample_user_profile,
    current_time_unix=current_moment
)

# 5. Print the results to see the magic happen!
print("✨ Your Personalized Short-Form Content Feed! ✨\n")
print("--- Top 3 Recommendations ---")
for i, content in enumerate(recommended_feed_for_user[:3]):
    print(f"\n{i+1}. Content ID: {content['id']}")
    print(f"   Relevance Score: {content['relevance_score']:.2f}") # Display score with 2 decimal places
    print(f"   Creator: {content['creator_id']}")
    print(f"   Views: {content['views']}, Likes: {content['likes']}, Comments: {content['comments']}, Shares: {content['shares']}")
    print(f"   Hashtags: {', '.join(content['hashtags'])}")
    print("-" * 40)

print("\n--- Full Recommended Feed (Sorted by Score) ---")
for content in recommended_feed_for_user:
    print(f"Content ID: {content['id']}, Score: {content['relevance_score']:.2f}")