// Self-invoking anonymous function
(function($) {
	'use strict';

	// Hide the loading spinner image.
	$('#spinnerShow').hide();

	// Show the buttons
	$('#buttonSection').show();

	// Click event listeners for buttons
	$('#btnSignUp').click(function() {
	  signUp();
	});

	$('#btnSignIn').click(function() {
	  signIn();
	});

	$('#btnSignOut').click(function() {
	  signOut();
	});

	$('#btnUpdate').click(function() {
	  updateProfile();
	});

	$('#forgotPassword').click(function() {
	  forgotPassword();
	});

	$('#btnSync').click(function() {
	  getCognitoSynToken();
	});

	$('#btnS3').click(function() {
	  createObject();
	});

	/***************** The main code ******************/

	// Region must be defined
	AWS.config.region = 'us-east-2';

	// User Pool
	var poolData = {
		UserPoolId: 'us-east-2_1wMgnys3q',
		ClientId: '6045svoojm317evb1jjcomf993'
	};

	// Identity Pool ID
	var identityPoolId = "us-east-2:f7e35bf4-0335-4f84-8932-4aab68e85292";

	// Cognito Sync store Name
	var cognitoDatasetName = "haleiiieTest-users";

	var cognitoUser, identityId, cognitoSync;

	// Sign Up
	function signUp(){

		console.log('Starting Sign up process');

		// Close the modal Window
		$('signUpModal').modal("hide");

		// Get sign up information from Modal
		var userLogin = {
			username: $('#inputPreferredUsername').val(),
			password: $('#inputPassword').val()
		};

		var attributes = [
			{
				Name: 'birthdate',
				Value: $('#inputBirthdate').val()
			},
			{
				Name: 'email',
				Value: $('#inputEmail').val()
			},
			{
				Name: 'name',
				Value: $('#inputName').val()
			},
			{
				Name: 'preferred_username',
				Value: $('#inputPreferredUsername').val()
			},
			{
				Name: 'website',
				Value: $('#inputWebsite').val()
			}
		];

		var params = {
			ClientId: poolData.ClientId, /* required */
			Password: userLogin.password, /* required */
			Username: userLogin.username, /* required */
			UserAttributes: attributes
		};

		var cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();
		cognitoidentityserviceprovider.signUp( params, function(err, data) {
			if(err) {
				console.log(err, err.stack); //an error occurred
				alert('Error: ' + JSON.stringify(err));
			} else {
				console.log(JSON.stringify(data));
				if(data.UserConfirmed) {
					bootbox.alert('Please check your email for a verification link.');
				} else {
					bootbox.alert('Sign up successful.');
				}
			}
		});

	}

	// Sign In
	function signIn(){
		var authenticationData = {
			Username: $('#inputUsername').val(),
			Password: $('#inputPassword2').val()
		};

		$('signInModal').modal("hide"); // Close the modal window

		var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);

		var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
		var userData = {
			Username: authenticationData.Username,
			Pool: userPool
		};
		cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
		cognitoUser.authenticateUser(authenticationDetails, {
			onSuccess: function(result) {
				createCredentials(result.getIdToken().getJwtToken());
				console.log("Signed in successfully!");
			},
			onFailure: function(err) {
				if(err.message == '200') { // Success return
					cognitoUser = userPool.getCurrentUser();
					if(cognitoUser != null) {
						cognitoUser.getSession(function(err, result) { // Get ID token from session
							if(err) {
								alert(err);
							}
							if(result) {
								createCredentials(result.getIdToken().getJwtToken());
								console.log("Signed to CognitoID in successfully");
								$('#signInModal').modal("hide");
							}
						});
					} else {
						alert(JSON.stringify(err));
					}
				} else {
					alert(JSON.stringify(err));
				}
			}
		});
	}

	function createCredentials(idToken) {
		AWS.config.credentials = new AWS.CognitoIdentityCredentials({
			IdentityPoolId: identityPoolId,
			Logins: {
				'cognito-idp.us-east-2.amazonaws.com/us-east-2_1wMgnys3q': idToken
			}
		});
		// refreshes credentials using AWS.CognitoIdentity.getCredentialsForIdentity()
		AWS.config.credentials.refresh((error) => {
			if(error) {
				console.error(error);
			} else {
				// Instantiate aws sdk service objects now that the credentials have been updated
				// example: var s3 = new AWS.S3();
				console.log('Successfully logged!');
			}
		})
	}

	// Sign Out
	function signOut() {
		if(cognitoUser != null) {
			bootbox.confirm({
				title: "Sign out",
				message: "Do you want to also invalidate all user data on this device?",
				buttons: {
					cancel: {
						label: '<i class="fa fa-times"></i> No'
					},
					confirm: {
						label: '<i class="fa fa-check"></i> Yes'
					}
				},
				callback: function(result) {
					if(result) {
						cognitoUser.globalSignOut({
							onSuccess: function(result) {
								bootbox.alert("Successfully signed out and invalidated all app records.");
							},
							onFailure: function(err) {
								alert(JSON.stringify(err));
							}
						});
					} else {
						cognitoUser.signOut();
						bootbox.alert("Signed out of app.");
					}
				}
			})
		} else {
			bootbox.alert("You are not signed in!");
		}
	}

	// Update profile
	function updateProfile(){
		if(cognitoUser != null) { //Verify user is logged in
			console.log('Starting update process');

			var attributes = [
					{
						Name: 'birthdate',
						Value: $('#inputBirthdate2').val()
					},
					{
						Name: 'name',
						Value: $('#inputName2').val()
					},
					{
						Name: 'website',
						Value: $('#inputWebsite2').val()
					}
			];

			console.log('Adding attributes');

			var attributeList = [];
			for(var a=0; a<attributes.length; ++a) {
				var attributeTemp = new AmazonCognitoIdentity.CognitoUserAttribute(attributes[a]);
				attributeList.push(attributeTemp);
			}

			console.log('Updating profile');

			$('#updateModal').modal("hide"); // close the modal window

			cognitoUser.updateAttributes(attributeList, function(err, result) {
				if(err) {
					alert(JSON.stringify(err.message));
					return;
				}
				console.log('call result: ' + JSON.stringify(result));
				bootbox.alert("Successfully updated!");
			});
		} else {
			bootbox.alert("You are not signed in!");
		}
	}

	// Forgot password
	function forgotPassword(){

		var verificationCode, newPassword, forgotUser;
		console.log('Forgot Password');
		bootbox.prompt("Enter username or email", function(result) {
			console.log("User: " + result);
			forgotUser = result;
			var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
			var userData = {
				Username: forgotUser,
				Pool: userPool
			};
			console.log("Creating user " + JSON.stringify(userData));
			cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
			cognitoUser.forgotPassword({
				onSuccess: function(data) {
					//successfully initiated reset password request
					console.log("CodeDeliveryData from forgotPassword: " + data);
				},
				onFailure: function(err) {
					console.log(JSON.stringify(err.message));
				},
				// optional automatic callback
				inputVerificationCode: function(data) {
						console.log('Code sent to: ' + JSON.stringify(data));
						bootbox.prompt('Please input verification code', function(result) {
							verificationCode = result;
							bootbox.prompt('Enter new password ', function(result) {
								newPassword = result;
								cognitoUser.confirmPassword(verificationCode, newPassword, {
									onSuccess() {
										console.log('Password confirmed!');
										bootbox.alert('Password confirmed!');
									},
									onFailure() {
										console.log(JSON.stringify(err.message));
									}
								})
							});
						});
				}
			});
		});

	}

	// Get Cognito Sync token
	function getCognitoSynToken(){
		/* Other AWS SDKs will automatically use the Cognito Credentials provider
			 configured in the JavaScript SDK. */
			 var cognitoSyncToken, cognitoSyncCount;
			 identityId = AWS.config.credentials.identityId;
			 cognitoSync = new AWS.CognitoSync();
			 cognitosync.listRecords({
				 DatasetName: cognitoDatasetName, // Required
				 IdentityId: identityId, // Required
				 IdentityPoolId: identityPoolId // Required
			 }, function(err, data) {
				 if(err) console.log("listRecords: " + err, err.stack); //error occurred
				 else {
					 console.log("listRecords: " + JSON.stringify(data));
					 cognitoSyncToken = data.SyncSessionToken;
					 cognitoSyncCount = data.DatasetSyncCount;
					 console.log("SyncSessionToken: " + cognitoSyncToken); //Successful response
					 console.log("DatasetSyncCount: " + cognitoSyncCount);
					 addRecord(cognitoSyncToken, cognitoSyncCount);
				 }
			 });
	}

	/*
	Now that we have our CognitoSync session token we can use this to add,
	modify or delete CognitoSync dataset records.

	To demonstrate we are going to call addRecord to add a record. Now lets add
	a record called 'USER_ID' that stores the users Cognito ID. We need to not only
	pass the CognitoSync session token but also the syncount that we got from the
	call to listRecords.
	*/

	function addRecord(cognitoSyncToken, cognitoSyncCount) {
		var params = {
			DatasetName: cognitoDatasetName, //Required
			IdentityId: identityId, //Required
			IdentityPoolId: identityPoolId, //Required
			SyncSessionToken: cognitoSyncToken, //required
			RecordPatches: [
				{
					Key: 'USER_ID', //Required
					Op: 'replace', //Required
					SyncCount: cognitoSyncCount, //Required
					Value: identityId
				}
			]
		};

		console.log("UserID: " + identityId);
		cognitoSync.updateRecords(params, function(err, data) {
			if(err) {
				console.log("updateRecords: " + err, err.stack); //Error occurred
			} else {
				console.log("Value: " + JSON.stringify(data)); //Successful response
			}
		});
	}

	// Create an S3 object
	function createObject(){
		if(cognitoUser != null) {
			console.log("Creating S3 object");
			identityId = AWS.config.credentials.identityId;
			var prefix = 'cognito/backspace-academy' + identityId;
			var key = prefix + '/' + 'test' + '.json';
			console.log('Key: ' + key);
			var data = {
				'test': 'It worked!'
			};
			var temp = JSON.stringify(data);
			var bucketName = 'haleiiie-cognito-test';
			var objectParams = {
				Bucket: bucketName,
				Key: key,
				ContentType: 'json',
				Body: temp
			};

			//Save data to S3 bucket bucketName
			var s3 = new AWS.S3({
				params: {
					Bucket: bucketName
				}
			});

			s3.putObject(objectParams, function(err, data) {
				if(err) {
					console.log('Error saving to the cloud: ' + err);
					alert('danger', 'Error.', 'Unable to save data to S3.');
				} else {
					alert('success', 'Finished', 'Data saved to S3.');
				}
			});
		} else {
			bootbox.alert('You are not logged in!');
		}
	}


// End 	self-invoking anonymous function
})(jQuery);
