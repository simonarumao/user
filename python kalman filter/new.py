import cv2
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from orange_detector import OrangeDetector
from kalmanfilter import KalmanFilter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from datetime import datetime

cap = cv2.VideoCapture(0)

# Load detector
od = OrangeDetector()

# Load Kalman filter to predict the trajectory
kf = KalmanFilter()

# Create a figure and axis for the live graph
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

# Live graph setup
x_data_initial, y_data_initial = [], []
x_data_predicted, y_data_predicted = [], []
line_initial, = ax1.plot([], [], marker='o', linestyle='-', color='b', markersize=10, label='Initial Position')
line_predicted, = ax1.plot([], [], marker='o', linestyle='-', color='r', markersize=10, label='Predicted Position')

# PDF Report setup
pdf_report = "object_detection_report.pdf"
pdf_canvas = canvas.Canvas(pdf_report, pagesize=letter)
pdf_canvas.setFont("Helvetica", 12)

def init():
    ax1.set_xlim(0, 640)
    ax1.set_ylim(0, 480)
    ax2.set_xlim(0, 640)
    ax2.set_ylim(0, 480)
    ax1.legend()
    return line_initial, line_predicted

def update(frame):
    ret, frame = cap.read()
    if ret is False:
        ani.event_source.stop()

    orange_bbox = od.detect(frame)
    x, y, x2, y2 = orange_bbox
    cx = int((x + x2) / 2)
    cy = int((y + y2) / 2)

    predicted = kf.predict(cx, cy)

    x_data_initial.append(cx)
    y_data_initial.append(cy)
    x_data_predicted.append(predicted[0])
    y_data_predicted.append(predicted[1])

    line_initial.set_data(x_data_initial, y_data_initial)
    line_predicted.set_data(x_data_predicted, y_data_predicted)

    ax2.clear()
    ax2.imshow(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    ax2.scatter(cx, cy, s=100, c='b', marker='o', label='Initial Point')
    ax2.scatter(predicted[0], predicted[1], s=100, c='r', marker='o', label='Predicted Point')
    
    # Label the object as "Missile (Pen)"
    ax2.text(cx, cy, 'Missile (Pen)', color='white', fontsize=10, ha='center', va='center')

    ax2.set_title('Object Detection Frame')
    ax2.legend()

    plt.pause(0.001)

    return line_initial, line_predicted

def save_pdf():
    pdf_canvas.drawString(100, 800, "Object Detection Report")
    pdf_canvas.drawString(100, 780, f"Report Number: {datetime.now().strftime('%Y%m%d%H%M%S')}")
    pdf_canvas.drawString(100, 760, f"Date of Report: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    pdf_canvas.drawString(100, 740, "Graph:")
    pdf_canvas.drawString(100, 730, "1. Blue: Initial Position")
    pdf_canvas.drawString(100, 720, "2. Red: Predicted Position")

    # Additional information
    pdf_canvas.drawString(100, 700, "Object Behavior Analysis:")
    pdf_canvas.drawString(100, 690, "Detected Object: Missile (Pen)")
    # Add your object behavior analysis information here

    # Speed of the object
    pdf_canvas.drawString(100, 680, "Speed of the Object:")
    # Add your speed analysis information here

    # Add a final graph
    final_graph_path = "final_graph.png"
    plt.savefig(final_graph_path)
    pdf_canvas.drawString(100, 650, "Final Graph:")
    pdf_canvas.drawInlineImage(final_graph_path, 100, 620, width=400, height=200)

    pdf_canvas.showPage()

# Save PDF after animation is finished
ani = FuncAnimation(fig, update, init_func=init, blit=True)
ani.event_source.stop()
save_pdf()
pdf_canvas.save()

plt.show()

cap.release()
cv2.destroyAllWindows()
