# Test Report 

## Test -01 — User Registration (Normal User)

**Steps:**
1. Open http://localhost:3000
2. Click **Join free** button in the top-right navbar
3. Enter username: `testuser1`
4. Enter password: `pass123`
5. Leave **Register as Administrator** checkbox unchecked
6. Click **Create Account**

**Result:** User chip appeared with `T` avatar and username `testuser1`. No Admin is badge shownand the uers session persisted on page refresh.

## Test-02 — User Registration (Duplicate Username)

**Steps:**
1. Click **Join free**
2. Enter username: `testuser1`
3. Enter password: `pass123`
4. Click **Create Account**

**Result:** error message is shown and no account is created.

## Test-03 — Admin Registration and Badge Display

**Steps:**
1. Click **Join free**
2. Enter username: `adminuser`
3. Enter password: `pass123`
4. Check the **Register as Administrator** checkbox
5. Click **Create Account**

**Result:** Navbar shows `adminuser` chip, purple admin badge, and a panel option

## Test-04 — Sign In with Valid Credentials

**Steps:**
1. Click **Sign in**
2. Enter username: `ayaan`
3. Enter password: `pass123`
4. Click **Sign In**

**Result:** Login successful, admin badge and panel button is visible. 

## Test-05 — Sign In with Invalid Credentials

**Steps:**
1. Click **Sign in**
2. Enter username: `ayaan`
3. Enter password: `wrongpassword`
4. Click **Sign In**

**Result:** Error message is displayed. Navbar still shows sign in option

## Test-06 — Sign Out

**Steps:**
1. Click **Sign out** in the navbar

**Result:** Navbar reverted correctly and home view displayed. 

## Test-07 — Create a Channel (Admin Only)

**Steps:**
1. In the sidebar, click the **＋** icon next to "Channels"
2. Enter channel name: `channel`
3. Enter description: `some text`
4. Click **Create Channel**

**Result:** Channel appeared at the bottom of the sidebar. Clicking it navigated to channel view showing heading channel with description.


## Test-08 — Create Channel Button Hidden for Non-Admin

**Steps:**
1. Observe the sidebar "Channels" header

**Result:** The plus button was not visible for `testuser1`. The sidebar only showed the channel list without any create button.

## Test-09 — Create a Post in a Channel

**Steps:**
1. Click `#test-channel` in the sidebar
2. Click **Ask Question** button
3. Enter title: `yet another channel`
4. Enter content: `some text`
5. Click **Post Question**

**Result:** Post appeared immediately at the top of the channel list. Author, date, and score is displayed correctly.

## Test-10 — View Thread and Add a Reply

**Steps:**
1. Click on the post card `yet another channel`
2. Verify thread view opens with full post body
3. Click **Add Reply**
4. Enter content: `some text`
5. Click **Post Reply**

**Result:** Thread view shows 1 reply with the content, author (`ayaan`), and timestamp. Reply count badge updated to `1`.

## Test-11 — Nested (Threaded) Reply

**Steps:**
1. Open the thread from TC-09
2. Click **Reply to user** link under ayaan's reply
3. Enter content: `some text`
4. Click **Post Reply**

**Result:** The reply appeared indented under users reply.

## Test-12 — Upvote and Downvote a Post

**Steps:**
1. In `#test-channel`, find the post `How do I center a div in CSS?` (initial score: 0)
2. Click **upvote** — note new score
3. Click **upvote** again to toggle off.
4. Click **downvote** — note new score

**Result:** All three score changes were correct. Toggle-off worked correctly, clicking same arrow twice removed the vote.

## Test-13 — Search by Substring

**Steps:**
1. In the search bar, type: `some text`
2. Ensure the dropdown shows `Substring`
3. Press **Enter** or click **Search**

**Result:** Post appeared in results.

## Test-14 — Admin Panel: Delete a User

**Steps:**
1. Click **Panel** in the navbar
2. Locate `testuser1` in the user list
3. Click **Delete** next to `testuser1`
4. Confirm the browser dialog

**Result:** `testuser1` was removed from the list.
