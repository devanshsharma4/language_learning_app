#!/bin/bash

BASE="http://localhost:3001"
TOKEN=""

echo "=== 1. Register ==="
REGISTER=$(curl -s -X POST $BASE/api/auth/register -H "Content-Type: application/json" -d '{"email":"testuser@example.com","password":"password123","name":"Test User"}')
echo "$REGISTER"
TOKEN=$(echo "$REGISTER" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo ""
  echo "=== 1b. Register failed (user may exist), trying login ==="
  LOGIN=$(curl -s -X POST $BASE/api/auth/login -H "Content-Type: application/json" -d '{"email":"testuser@example.com","password":"password123"}')
  echo "$LOGIN"
  TOKEN=$(echo "$LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
fi

echo ""
echo "Using token: ${TOKEN:0:20}..."
echo ""

echo "=== 2. Get Profile ==="
curl -s $BASE/api/auth/me -H "Authorization: Bearer $TOKEN"
echo ""
echo ""

echo "=== 3. Update Language ==="
curl -s -X PUT $BASE/api/auth/language -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"language":"spanish"}'
echo ""
echo ""

echo "=== 4. Create Lesson (takes a few seconds) ==="
LESSON=$(curl -s -X POST $BASE/api/lessons/create -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"language":"spanish","difficulty":"beginner","articleText":"El gato se sento en la alfombra. La familia estaba muy contenta con su nueva mascota. Todos los dias, el gato jugaba en el jardin y perseguia a los pajaros. Por la noche, dormia junto a la chimenea. Los ninos le daban comida y agua todos los dias. Era un gato muy feliz que amaba a su familia."}')
echo "$LESSON"
LESSON_ID=$(echo "$LESSON" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo ""
echo "Lesson ID: $LESSON_ID"
echo ""

echo "=== 5. List Lessons ==="
curl -s "$BASE/api/lessons" -H "Authorization: Bearer $TOKEN"
echo ""
echo ""

echo "=== 6. Get Lesson $LESSON_ID ==="
curl -s "$BASE/api/lessons/$LESSON_ID" -H "Authorization: Bearer $TOKEN"
echo ""
echo ""

echo "=== 7. Submit Responses (takes a few seconds) ==="
# The payload is built from the lesson that was just created rather than
# hardcoded. This step used to send {"questionAnswers": ...} with invented ids
# like "q1" -- a body shape the API stopped accepting when answers were split
# into mcqAnswers and shortAnswerResponses, so it had always returned 400.
SUBMIT_BODY=$(echo "$LESSON" | python3 -c '
import json, sys
lesson = json.load(sys.stdin)["data"]["lesson"]
mcqs = [q for q in lesson["questions"] if "options" in q]
short = [q for q in lesson["questions"] if q["type"] == "short_answer"]
print(json.dumps({
    # Answer every MCQ correctly so the expected score is a known 100%.
    "mcqAnswers": [
        {"questionId": q["id"], "selectedOption": q["correctAnswer"]} for q in mcqs
    ],
    "shortAnswerResponses": [
        {"questionId": q["id"], "answer": "El gato jugaba en el jardin y perseguia a los pajaros."}
        for q in short
    ],
    "writingResponses": [
        {"promptId": p["id"], "response": "El gato dormia junto a la chimenea por la noche. Durante el dia jugaba en el jardin."}
        for p in lesson["writing_prompts"]
    ],
}))
')
curl -s -X POST "$BASE/api/lessons/$LESSON_ID/submit" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d "$SUBMIT_BODY"
echo ""
echo ""

echo "=== 8. Save Vocabulary ==="
SAVED=$(curl -s -X POST $BASE/api/vocabulary/save -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"word":"gato","translation":"cat","explanation":"A domestic cat","context":"El gato se sento en la alfombra","language":"spanish"}')
echo "$SAVED"
VOCAB_ID=$(echo "$SAVED" | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["vocabulary"]["id"])')
echo ""
echo ""

echo "=== 9. List Vocabulary ==="
curl -s "$BASE/api/vocabulary?language=spanish" -H "Authorization: Bearer $TOKEN"
echo ""
echo ""

# Deletes the word saved in step 8 rather than a hardcoded id=1, which stopped
# existing as soon as the test database was reset.
echo "=== 10. Delete Vocabulary (id=$VOCAB_ID) ==="
curl -s -X DELETE "$BASE/api/vocabulary/$VOCAB_ID" -H "Authorization: Bearer $TOKEN"
echo ""
echo ""

echo "=== Done! ==="
