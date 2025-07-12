# Generated with 💚 by Avurna AI (2025)
# For educational/demo use. Review before production.

import requests
from bs4 import BeautifulSoup

def scrape_hacker_news_top_posts(num_posts=5):
    """
    Scrapes the top N posts from Hacker News.

    Args:
        num_posts (int): The number of top posts to scrape. Defaults to 5.

    Returns:
        list: A list of dictionaries, where each dictionary contains
              'title' and 'url' of a post.
    """
    # The URL for the Hacker News front page
    url = "https://news.ycombinator.com/"
    
    print(f"Fetching the top {num_posts} posts from Hacker News, there...")

    try:
        # Send a GET request to the URL
        response = requests.get(url)
        response.raise_for_status()  # Raise an HTTPError for bad responses (4xx or 5xx)
    except requests.exceptions.RequestException as e:
        print(f"Uh oh, couldn't fetch the page! Error: {e}")
        return []

    # Parse the HTML content of the page
    soup = BeautifulSoup(response.text, 'html.parser')

    # Hacker News posts are typically in rows with class 'athing'
    # We're looking for the 'titleline' class within these rows for the link and title
    posts = []
    for i, row in enumerate(soup.find_all('tr', class_='athing')):
        if len(posts) >= num_posts:
            break # Stop once we have enough posts

        title_tag = row.find('span', class_='titleline')
        if title_tag:
            link = title_tag.find('a')
            if link and link.get('href') and link.text:
                title = link.text
                post_url = link.get('href')

                # Hacker News often uses relative URLs for internal links,
                # so we need to make them absolute.
                if post_url.startswith('item?id='):
                    post_url = f"https://news.ycombinator.com/{post_url}"
                
                posts.append({
                    'title': title,
                    'url': post_url
                })
                print(f"Found post {len(posts)}: '{title}'")

    if not posts:
        print("Hmm, couldn't find any posts. The website structure might have changed, there.")

    return posts

if __name__ == "__main__":
    top_posts = scrape_hacker_news_top_posts(num_posts=5)

    if top_posts:
        print("\n✨ Here are the top posts from Hacker News, there! ✨")
        for i, post in enumerate(top_posts):
            print(f"{i + 1}. {post['title']}")
            print(f"   Link: {post['url']}\n")
    else:
        print("\nCouldn't retrieve the top posts this time. Maybe try again later?")