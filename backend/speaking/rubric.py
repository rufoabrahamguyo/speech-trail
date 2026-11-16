RUBRIC = [
    {
        "key": "confidence",
        "label": "Confidence and presence",
        "description": "How grounded and assured the speaker appears.",
        "items": [
            {"key": "posture", "label": "Stands or sits with an open posture."},
            {"key": "eyes", "label": "Makes eye contact."},
            {"key": "calm", "label": "Appears calm and composed."},
            {"key": "gesture", "label": "Uses purposeful gestures."},
            {"key": "space", "label": "Owns the space."},
        ],
    },
    {
        "key": "voice",
        "label": "Voice and delivery",
        "description": "How clearly and expressively the speaker is heard.",
        "items": [
            {"key": "clear", "label": "Speaks clearly."},
            {"key": "pace", "label": "Maintains an appropriate pace."},
            {"key": "pauses", "label": "Uses pauses effectively."},
            {"key": "fillers", "label": "Avoids excessive filler words."},
            {"key": "tone", "label": "Varies tone and pitch."},
        ],
    },
    {
        "key": "content",
        "label": "Content and organization",
        "description": "How easy the ideas are to follow.",
        "items": [
            {"key": "open", "label": "Opens with a clear point."},
            {"key": "structure", "label": "Structures ideas logically."},
            {"key": "examples", "label": "Supports points with examples."},
            {"key": "focus", "label": "Stays on topic."},
            {"key": "close", "label": "Ends with a clear close."},
        ],
    },
    {
        "key": "audience",
        "label": "Audience engagement",
        "description": "How well the talk includes the people in the room.",
        "items": [
            {"key": "direct", "label": "Addresses the listener directly."},
            {"key": "adjust", "label": "Reads the room and adjusts."},
            {"key": "invite", "label": "Invites a response."},
            {"key": "stories", "label": "Uses a story or a concrete image."},
            {"key": "energy", "label": "Keeps energy right for the room."},
        ],
    },
    {
        "key": "language",
        "label": "Language and articulation",
        "description": "How precise and speakable the words are.",
        "items": [
            {"key": "precise", "label": "Chooses precise words."},
            {"key": "pronounce", "label": "Pronounces words clearly."},
            {"key": "jargon", "label": "Avoids jargon, or explains it."},
            {"key": "sentences", "label": "Sentences are easy to follow."},
            {"key": "fit", "label": "Language fits the audience."},
        ],
    },
]

CATEGORIES = {category["key"]: category for category in RUBRIC}
CATEGORY_INDEX = {category["key"]: index for index, category in enumerate(RUBRIC)}
ITEMS = {
    (category["key"], item["key"]): item["label"]
    for category in RUBRIC
    for item in category["items"]
}
