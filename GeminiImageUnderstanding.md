Image understanding

Gemini models are built to be multimodal from the ground up, unlocking a wide range of image processing and computer vision tasks including but not limited to image captioning, classification, and visual question answering without having to train specialized ML models.

Tip: In addition to their general multimodal capabilities, Gemini models (2.0 and newer) offer improved accuracy for specific use cases like object detection and segmentation, through additional training. See the Capabilities section for more details.
Passing images to Gemini
You can provide images as input to Gemini using two methods:

Passing inline image data: Ideal for smaller files (total request size less than 20MB, including prompts).
Uploading images using the File API: Recommended for larger files or for reusing images across multiple requests.
Passing inline image data
You can pass inline image data in the request to generateContent. You can provide image data as Base64 encoded strings or by reading local files directly (depending on the language).

The following example shows how to read an image from a local file and pass it to generateContent API for processing.

Python
JavaScript
Go
REST

  from google.genai import types

  with open('path/to/small-sample.jpg', 'rb') as f:
      image_bytes = f.read()

  response = client.models.generate_content(
    model='gemini-2.5-flash',
    contents=[
      types.Part.from_bytes(
        data=image_bytes,
        mime_type='image/jpeg',
      ),
      'Caption this image.'
    ]
  )

  print(response.text)
You can also fetch an image from a URL, convert it to bytes, and pass it to generateContent as shown in the following examples.

Python
JavaScript
Go
REST

from google import genai
from google.genai import types

import requests

image_path = "https://goo.gle/instrument-img"
image_bytes = requests.get(image_path).content
image = types.Part.from_bytes(
  data=image_bytes, mime_type="image/jpeg"
)

client = genai.Client()

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=["What is this image?", image],
)

print(response.text)