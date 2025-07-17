const SPREADSHEET_ID = '1plWv1eoU6pg8HleNFiBHTh_iXmDevcm067ZLrJbSCqk';
const SHEET_NAME = 'ONLINE ORDERS';
const NOTIFICATION_EMAIL = 'chozasmaryyvette@gmail.com'; // Your business email

/**
 * Serves the HTML file for the web app.
 */
function doGet() {
  return HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle('Sweet Mary\'s Order Form');
}

/**
 * Processes the form submission and logs data to the Google Sheet.
 * @param {Object} formData The data submitted from the HTML form.
 * @return {string} A success message.
 */
function submitOrder(formData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error(`Sheet with name "${SHEET_NAME}" not found.`);
  }

  // Get current timestamp for the order
  const timestamp = new Date();

  // Parse ordered items from JSON string back to an array of objects
  let orderedItems;
  try {
    orderedItems = JSON.parse(formData.orderedItems);
  } catch (e) {
    console.error("Error parsing orderedItems:", e);
    orderedItems = []; // Default to empty array if parsing fails
  }

  // Format ordered items for the sheet (e.g., "Item A (x2), Item B (x1)")
  const formattedItems = orderedItems.map(item => `${item.name} (x${item.quantity})`).join(', ');

  // Determine the location to log based on order type
  const location = formData.orderType === 'delivery' ? formData.shippingAddress : formData.pickupLocation;

  // Prepare the row data to be appended
  const rowData = [
    timestamp,
    formData.fullName,
    formData.email,
    formData.address,
    formData.contactNumber,
    formData.orderType, // Log order type
    location, // Log shipping address or pickup location
    formData.paymentMethod,
    formData.orderType === 'delivery' ? formData.deliveryDate : 'N/A', // Only log date/time for delivery
    formData.orderType === 'delivery' ? formData.deliveryTime : 'N/A', // Only log date/time for delivery
    formattedItems,
    formData.subTotalAmount,
    formData.deliveryFee,
    formData.totalAmount,
    formData.remarks
  ];

  // Append the new row to the sheet
  sheet.appendRow(rowData);

  // Send email notification to the business owner
  sendOrderNotification(formData, orderedItems, timestamp);

  // Send email confirmation to the customer
  sendCustomerConfirmationEmail(formData, orderedItems, timestamp);

  return 'Your order has been placed successfully! We\'ll confirm it shortly.';
}

/**
 * Sends an email notification about the new order to the business.
 * @param {Object} formData The submitted form data.
 * @param {Array} orderedItems An array of ordered items.
 * @param {Date} timestamp The timestamp of the order.
 */
function sendOrderNotification(formData, orderedItems, timestamp) {
  const subject = `New Sweet Mary's Order from ${formData.fullName}`;

  let emailBody = `
    Hello Sweet Mary's Team,

    A new order has been placed through the online form!

    Order Details:
    ---------------------------------------------------
    Order ID: ${timestamp.getTime()}
    Order Timestamp: ${timestamp.toLocaleString('en-US', { timeZone: 'Asia/Manila' })}
    Customer Name: ${formData.fullName}
    Email: ${formData.email}
    Contact Number: ${formData.contactNumber}
    Billing Address: ${formData.address}
    Order Type: ${formData.orderType.toUpperCase()}
    ${formData.orderType === 'delivery' ? `Shipping Address: ${formData.shippingAddress}` : `Pickup Location: ${formData.pickupLocation}`}
    Payment Method: ${formData.paymentMethod}
    ${formData.orderType === 'delivery' ? `Delivery Date: ${formData.deliveryDate}` : ' '}
    ${formData.orderType === 'delivery' ? `Delivery Time: ${formData.deliveryTime}` : ' '}
    Remarks: ${formData.remarks || 'N/A'}

    Ordered Items:
  `;

  orderedItems.forEach(item => {
    emailBody += `\n- ${item.name} (x${item.quantity}) - ₱${(item.price * item.quantity).toFixed(2)}`;
  });

  emailBody += `
    ---------------------------------------------------
    Subtotal: ₱${formData.subTotalAmount.toFixed(2)}
    Delivery Fee: ₱${formData.deliveryFee.toFixed(2)}
    Total Amount: ₱${formData.totalAmount.toFixed(2)}

    Please check the Google Sheet "${SHEET_NAME}" for full details.
    
    Best regards,
    Sweet Mary's Order System
  `;

  try {
    MailApp.sendEmail({
      to: NOTIFICATION_EMAIL,
      subject: subject,
      body: emailBody
    });
    console.log(`Order notification sent to ${NOTIFICATION_EMAIL}`);
  } catch (e) {
    console.error(`Failed to send order notification email to business: ${e.message}`);
  }
}

/**
 * Sends an email confirmation to the customer with improved HTML styling.
 * @param {Object} formData The submitted form data.
 * @param {Array} orderedItems An array of ordered items.
 * @param {Date} timestamp The timestamp of the order.
 */
function sendCustomerConfirmationEmail(formData, orderedItems, timestamp) {
  const customerEmail = formData.email;
  if (!customerEmail) {
    console.warn("Customer email not provided, skipping confirmation email.");
    return;
  }

  const subject = `Sweet Mary's: Your Order #${timestamp.getTime()} Confirmation`;

  const gcashQrCodeSrc = "https://i.ibb.co/zWfVBnfD/image.png"; // Your GCash QR Code URL

  let paymentInstructionsHtml = '';
  if (formData.paymentMethod === 'GCASH') {
      paymentInstructionsHtml = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; margin-top: 20px; padding: 15px; border: 1px solid #ffcc66; border-radius: 8px; background-color: #fff8e1;">
              <h4 style="color: #c25c00; margin-top: 0; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px dashed #ffd790;">GCASH Payment Instructions</h4>
              <p style="margin-bottom: 8px;">Please send your payment to:</p>
              <p style="margin-bottom: 8px;"><strong>GCASH Name:</strong> MARY YVETTE C.</p>
              <p style="margin-bottom: 15px;"><strong>GCASH Number:</strong> 0966 224 8619</p>
              <div style="text-align: center; margin: 15px 0;">
                  <img src="${gcashQrCodeSrc}" alt="GCash QR Code" style="max-width: 250px; height: auto; border: 1px solid #ddd; border-radius: 8px;">
              </div>
              <p style="margin-top: 15px;"><strong>Important:</strong> After sending, please send a screenshot of your transaction to our Facebook page for confirmation:</p>
              <p><a href="https://www.facebook.com/profile.php?id=100063710546594" target="_blank" style="color: #007bff; text-decoration: none;">Sweet Mary's Facebook Page</a></p>
              <p style="margin-top: 10px;">Your order will be processed upon payment confirmation.</p>
          </div>
      `;
  } else if (formData.paymentMethod === 'CASH') {
      paymentInstructionsHtml = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; margin-top: 20px; padding: 15px; border: 1px solid #ccffcc; border-radius: 8px; background-color: #e8ffe8;">
              <h4 style="color: #2e8b57; margin-top: 0; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px dashed #b3e6b3;">CASH Payment Instructions</h4>
              <p style="margin-bottom: 8px;">Please prepare the exact amount for your order upon ${formData.orderType === 'delivery' ? 'delivery' : 'pickup'}.</p>
              ${formData.orderType === 'delivery' ? '<p>Our rider will collect the payment when your delicious treats arrive!</p>' : '<p>Payment will be collected upon pickup at our designated location.</p>'}
          </div>
      `;
  }

  // Determine display text for delivery/pickup details
  const deliveryOrPickupDetailsHtml = formData.orderType === 'delivery' ? `
      <li><strong>Delivery Date:</strong> ${formData.deliveryDate}</li>
      <li><strong>Delivery Time:</strong> ${formData.deliveryTime}</li>
      <li><strong>Shipping Address:</strong> ${formData.shippingAddress}</li>
  ` : `
      <li><strong>Pickup Location:</strong> ${formData.pickupLocation}</li>
  `;

  let htmlBody = `
    <div style="font-family: 'Poppins', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); overflow: hidden;">
        <div style="background-color: #FF69B4; color: white; padding: 25px; text-align: center;">
            <h2 style="margin: 0; font-size: 24px; font-weight: 600;">Thank You for Your Sweet Mary's Order!</h2>
        </div>
        <div style="padding: 30px;">
            <p style="margin-bottom: 15px;">Hello ${formData.fullName},</p>
            <p style="margin-bottom: 15px;">This email confirms your order placed on ${timestamp.toLocaleString('en-US', { timeZone: 'Asia/Manila' })}.</p>
            <p style="font-weight: bold; margin-bottom: 20px; font-size: 1.1em;">Your Order ID: <span style="color: #FF69B4;">#${timestamp.getTime()}</span></p>

            <h3 style="color: #FF69B4; font-size: 1.5em; margin-top: 30px; margin-bottom: 15px; border-bottom: 1px solid #FFC0CB; padding-bottom: 8px;">Order Summary:</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.95em;">
                <thead>
                    <tr style="background-color: #f8f8f8;">
                        <th style="padding: 10px; border: 1px solid #eee; text-align: left;">Item</th>
                        <th style="padding: 10px; border: 1px solid #eee; text-align: left; width: 60px;">Qty</th>
                        <th style="padding: 10px; border: 1px solid #eee; text-align: right; width: 80px;">Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${orderedItems.map(item => `
                        <tr>
                            <td style="padding: 8px 10px; border: 1px solid #eee;">${item.name}</td>
                            <td style="padding: 8px 10px; border: 1px solid #eee;">x${item.quantity}</td>
                            <td style="padding: 8px 10px; border: 1px solid #eee; text-align: right;">₱${(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                    <tr style="font-weight: bold; background-color: #fff0f5;">
                        <td colspan="2" style="padding: 10px; border: 1px solid #eee; text-align: right;">Subtotal:</td>
                        <td style="padding: 10px; border: 1px solid #eee; text-align: right;">₱${formData.subTotalAmount.toFixed(2)}</td>
                    </tr>
                    ${formData.orderType === 'delivery' ? `
                    <tr style="font-weight: bold; background-color: #fff0f5;">
                        <td colspan="2" style="padding: 10px; border: 1px solid #eee; text-align: right;">Delivery Fee:</td>
                        <td style="padding: 10px; border: 1px solid #eee; text-align: right;">₱${formData.deliveryFee.toFixed(2)}</td>
                    </tr>
                    ` : ''}
                    <tr style="font-weight: bold; background-color: #ffe0b2; color: #c25c00;">
                        <td colspan="2" style="padding: 12px 10px; border: 1px solid #eee; text-align: right; font-size: 1.1em;">Total Amount:</td>
                        <td style="padding: 12px 10px; border: 1px solid #eee; text-align: right; font-size: 1.1em;">₱${formData.totalAmount.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            <h3 style="color: #FF69B4; font-size: 1.5em; margin-top: 30px; margin-bottom: 15px; border-bottom: 1px solid #FFC0CB; padding-bottom: 8px;">Your Details:</h3>
            <ul style="list-style-type: none; padding: 0; margin: 0;">
                <li><strong>Order Type:</strong> ${formData.orderType.toUpperCase()}</li>
                ${deliveryOrPickupDetailsHtml}
                <li><strong>Customer Contact:</strong> ${formData.contactNumber}</li>
                <li><strong>Payment Method:</strong> ${formData.paymentMethod}</li>
                ${formData.remarks ? `<li><strong>Remarks:</strong> ${formData.remarks}</li>` : ''}
            </ul>

            ${paymentInstructionsHtml}

            <p style="margin-top: 30px;">We'll send another update once your order is being prepared for ${formData.orderType === 'delivery' ? 'delivery' : 'pickup'}.</p>
            <p>If you have any questions, please reply to this email or contact us via our Facebook page.</p>
            <p style="text-align: center; margin-top: 40px; color: #666;">
                Best regards,<br>
                The Sweet Mary's Team<br>
                <a href="https://www.facebook.com/sweetmaryys" target="_blank" style="color: #FF69B4; text-decoration: none; font-weight: 500;">Sweet Mary's Facebook Page</a>
            </p>
        </div>
    </div>
  `;

  try {
    MailApp.sendEmail({
      to: customerEmail,
      subject: subject,
      htmlBody: htmlBody,
      name: "Sweet Mary's",
      replyTo: NOTIFICATION_EMAIL
    });
    console.log(`Confirmation email sent to customer: ${customerEmail}`);
  } catch (e) {
    console.error(`Failed to send customer confirmation email to ${customerEmail}: ${e.message}`);
  }
}

/**
 * This function is needed for the google.script.run.withSuccessHandler to work.
 * It's a placeholder. The actual content is in index.html.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
function getProducts() {
  const SPREADSHEET_ID = '1plWv1eoU6pg8HleNFiBHTh_iXmDevcm067ZLrJbSCqk'; // Your Sheet ID
  const SHEET_NAME = 'ONLINE ORDERS MENU'; // Your Sheet Tab Name

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error(`Sheet "${SHEET_NAME}" not found.`);
  }

  // Get all data from the sheet, assuming headers are in row 1
  const range = sheet.getDataRange();
  const values = range.getValues();

  if (values.length < 2) {
    // No data or only headers
    return [];
  }

  // Assuming headers are in the first row
  const headers = values[0];
  const data = values.slice(1); // Data rows

  const products = [];

  // Find column indices dynamically
  // Case-insensitive matching for robustness
  const idColIndex = headers.findIndex(header => typeof header === 'string' && header.trim().toLowerCase() === 'id');
  const priceColIndex = headers.findIndex(header => typeof header === 'string' && header.trim().toLowerCase() === 'price');
  const availableColIndex = headers.findIndex(header => typeof header === 'string' && header.trim().toLowerCase() === 'available');

  if (idColIndex === -1 || priceColIndex === -1 || availableColIndex === -1) {
    throw new Error('Required columns (ID, Price, Available) not found in the sheet.');
  }

  data.forEach(row => {
    const id = String(row[idColIndex]).trim();
    const price = parseFloat(row[priceColIndex]);
    let availableStatus = String(row[availableColIndex]).trim().toUpperCase();

    // Map sheet status to client-side understanding
    let isAvailable = true;
    let statusText = '';

    if (availableStatus === 'FALSE' || availableStatus === 'NOT AVAILABLE') {
      isAvailable = false;
      statusText = 'NOT AVAILABLE';
    } else if (availableStatus === 'SOLD OUT') {
      isAvailable = false;
      statusText = 'SOLD OUT';
    } else { // TRUE or any other value means available
      isAvailable = true;
      statusText = 'Available'; // Or empty, depending on preference
    }

    if (id) { // Only add if ID exists
      products.push({
        id: id,
        price: isNaN(price) ? 0 : price, // Default to 0 if price is not a number
        available: isAvailable,
        status: statusText // This will be 'Available', 'NOT AVAILABLE', or 'SOLD OUT'
      });
    }
  });

  Logger.log(products); // Log to see what's being returned for debugging
  return products;
}
// Function to get delivery locations and fees from the 'LOCATION' sheet
function getDeliveryLocations() {
  // Use the provided Sheet ID to open the correct spreadsheet
  const spreadsheetId = '1plWv1eoU6pg8HleNFiBHTh_iXmDevcm067ZLrJbSCqk';
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);

  const sheet = spreadsheet.getSheetByName('LOCATION'); // Make sure this sheet name is exact!
  if (!sheet) {
    console.error("Sheet 'LOCATION' not found in the specified spreadsheet ID.");
    // Optionally, you could throw an error here to immediately fail on the client-side
    // throw new Error("Delivery locations sheet 'LOCATION' not found.");
    return []; // Return an empty array if the sheet isn't found
  }

  // Get all data from the sheet, assuming Column A is Location and Column B is Fees
  // Adjust range as needed, e.g., 'A2:B' to skip headers if you have them
  const range = sheet.getRange('A2:B' + sheet.getLastRow());
  const values = range.getValues();

  const locations = values.map(row => {
    return {
      location: row[0], // Column A
      fee: parseFloat(row[1]) || 0 // Column B, ensure it's a number, default to 0 if invalid
    };
  }).filter(item => item.location && String(item.location).trim() !== ''); // Filter out empty rows or rows with empty locations

  return locations;
}
