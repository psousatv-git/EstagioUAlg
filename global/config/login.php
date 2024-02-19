<?php

if (isset($_POST["submit"])) {

  // First we get the form data from the URL
  $username = $_POST["inputUsername"];
  $password = $_POST["inputPassword"];

  // Then we run a bunch of error handlers to catch any user mistakes we can (you can add more than I did)
  // These functions can be found in functions.inc.php

  require_once "../../config/_myUsers.inc.php";
  require_once "../../config/validate.inc.php";

  // Left inputs empty
  if (emptyInputLogin($username, $password) === true) {
    header("location: ../index.php?error=EmptyInput");
		exit();
  }

  // If we get to here, it means there are no user errors
  // Now we insert the user into the database
  loginUser($conn, $username, $password);

} else {
	header("location: ../index.php");
    exit();
}
