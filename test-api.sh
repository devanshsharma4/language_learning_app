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
curl -s -X POST "$BASE/api/lessons/$LESSON_ID/submit" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"questionAnswers":{"q1":{"answer":"El gato se sento en la alfombra"},"q2":{"answer":"El gato jugaba y perseguia a los pajaros"},"q3":{"answer":"Los ninos le daban comida"}},"writingResponses":[{"promptId":"p1","response":"El gato dormia junto a la chimenea por la noche. Durante el dia, el gato jugaba en el jardin y perseguia a los pajaros."}]}'
echo ""
echo ""

echo "=== 8. Save Vocabulary ==="
curl -s -X POST $BASE/api/vocabulary/save -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"word":"gato","translation":"cat","explanation":"A domestic cat","context":"El gato se sento en la alfombra","language":"spanish"}'
echo ""
echo ""

echo "=== 9. List Vocabulary ==="
curl -s "$BASE/api/vocabulary?language=spanish" -H "Authorization: Bearer $TOKEN"
echo ""
echo ""

echo "=== 10. Delete Vocabulary (id=1) ==="
curl -s -X DELETE "$BASE/api/vocabulary/1" -H "Authorization: Bearer $TOKEN"
echo ""
echo ""

echo "=== Done! ==="
