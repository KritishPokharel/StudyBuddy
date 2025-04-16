from backend_code import get_transcript, collection, client, agent_id
import json
import time


def background_updater():
    # Ensure unique index on 'id' field
    collection.create_index("id", unique=True)

    while True:
        try:
            existing_ids = set(doc["id"] for doc in collection.find({}, {"id": 1}))

            response = client.conversational_ai.get_conversations(
                agent_id=agent_id
            ).json()
            response_dict = json.loads(response)
            print("Recevied response from the Labs API")
            new_entries = []

            for item in response_dict["conversations"]:
                conversation_id = item["conversation_id"]
                if conversation_id in existing_ids:
                    continue

                try:
                    data = get_transcript(conversation_id)
                    new_entries.append(data)
                    print(f"[Updater] Processed new conversation: {conversation_id}")
                except Exception as e:
                    print(f"[Updater] Error with {conversation_id}: {e}")
                    continue

            for entry in new_entries[::-1]:  # insert newest first
                try:
                    collection.update_one(
                        {"id": entry["id"]},
                        {"$setOnInsert": entry},
                        upsert=True,
                    )
                except Exception as e:
                    print(
                        f"[Updater] Skipped duplicate or errored insert for {entry['id']}: {e}"
                    )

            if new_entries:
                print(f"[Updater] Inserted {len(new_entries)} new conversation(s).")

        except Exception as e:
            print(f"[Updater] Unexpected error: {e}")

        time.sleep(3)  # wait 1 minute


if __name__ == "__main__":
    background_updater()
