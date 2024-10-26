from flask import Flask, jsonify, request
import requests
from groq import Groq, GroqError

app = Flask(__name__)

# Initialize the Groq client with the API key
api_key = "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"

try:
    client = Groq(api_key=api_key)
except GroqError as e:
    print(f"Failed to initialize Groq client: {e}")
    exit(1)

def generate_evacuate_tips(location):
    prompt = f"Provide evacuation tips for a person in an air threat disaster emergency situation in {location}.Just Give the tips and no introduction before and after, make sure that at the time of the disaster they do have short time for evacuation so they cant carry things like towels bags and flashlights etc. Also make sure give tips related to health for avoiding radation heal and protect third degree burns how to evacuate from a fallrn building , how to make sure to breathe properlyh in this situation and hoe to protect people from heart attacak . this are the prompt which is required "
    
    try:
        completion = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=150,
            top_p=1,
            stream=True,
            stop=None,
        )

        tips = ""
        for chunk in completion:
            tips += chunk.choices[0].delta.content or ""
        
        return tips if tips else "No tips generated."
        
    except GroqError as e:
        return f"Error while fetching evacuation tips: {e}"

def find_nearby_facilities(lat, lon, radius=1000):
    overpass_url = "http://overpass-api.de/api/interpreter"
    overpass_query = f"""
    [out:json];
    (
      node["amenity"="hospital"](around:{radius}, {lat}, {lon});
      node["shop"="mall"](around:{radius}, {lat}, {lon});
      node["building"](around:{radius}, {lat}, {lon});
    );
    out body;
    """
    
    response = requests.get(overpass_url, params={'data': overpass_query})
    
    if response.status_code == 200:
        data = response.json()
        facilities = data.get('elements', [])
        tips = generate_evacuate_tips(f"latitude {lat}, longitude {lon}")
        tips = tips.replace("", "").replace("*", "").replace("?", "").replace("##", "")
        return facilities, tips
    else:
        return None, f"Error: {response.status_code} {response.text}"

@app.route('/get_facilities', methods=['GET'])
def get_facilities():
    lat = request.args.get('lat', type=float, default=19.071636478920574)
    lon = request.args.get('lon', type=float, default=72.87461639948543)
    radius = request.args.get('radius', type=int, default=1000)
    
    facilities, tips = find_nearby_facilities(lat, lon, radius)
    
    if facilities is not None:
        return jsonify({
            "facilities": facilities,
            "evacuation_tips": tips
        })
    else:
        return jsonify({"error": tips}), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True)
