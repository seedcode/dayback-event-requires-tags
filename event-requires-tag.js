// Required Tags v1.02

// Purpose:
// Warns if an event is being edited and doesn't contain a required tag.
// Required tags are a comma separated list or an array of tags stored in a field in the edited event.
// Action Type: Before Event Save 
// Prevent Default Action: Yes

// More info on custom App Actions here:
// https://docs.dayback.com/article/140-custom-app-actions

// Declare globals
var options = {}; var inputs = {};

try {

    //----------- Configuration -------------------

        // Options specified for this action
        
        // Seconds to wait to allow this action to run before reporting an error (set to 0 to deactivate)
        options.runTimeout = 0;
        // Array of account emails for whom this action will run. Leave blank to allow the action to run for everyone.
        // Example: ['person@domain.com', 'someone@domain.com']
        options.restrictedToAccounts = [];

        // Any input data for the action should be specified here

		// The field to get a comma separated list of tag names to match against; this is the field in your event
		// that contains the event's required tags.
		// This is likely a custom field and you should reference it by its "ID for Caledar Actions" like this;
		// inputs.tagMatchField = '1623856940411-2058994056'; (Saleforce and Google)
		// or
		// inputs.tagMatchField = 'dbk-additionalField-03'; (FileMaker)
		inputs.tagMatchField = ''; 

        // The currently signed in account email
        inputs.account = seedcodeCalendar.get('config').account;

    //----------- End Configuration -------------------

}
catch(error) {
    reportError(error);
}



//----------- The action itself: you may not need to edit this. -------------------


// Action code goes inside this function
function run() {
	// Assign variables
	var eventData = editEvent;
	var eventResources = eventData.resource || [];
	var eventChanges = dbk.eventChanged(editEvent, editEvent.event);

	var tagNames = eventData[inputs.tagMatchField];
	var cancelButtonText = event.beforeDrop ? 'Revert' : 'Cancel';

	var matchedTags;
	var tagString;
	
    // Check for required inputs and exit if any are missing or if we don't need to check tags
	if ((!eventChanges && !event.beforeDrop) || !tagNames) {
		confirmCallback();
		return;
	}
	
	// Convert tag list to array if it isn't already
	if (!Array.isArray(tagNames)) {
		tagNames = tagNames.split(",").map(function(item) {
			return item.trim();
		});
	}
	
	// Get any matching tags (returns array of matched tags)
	matchedTags = getMatchingTags(tagNames, eventResources, false);

	// Convert array of matched tags to comma separated tag names
	tagString = tagNames.join(', ');
	
	// If there are no matching required tags show a warning	
	if (!matchedTags || matchedTags.length < tagNames.length) {
		utilities.showModal(
			'Resource missing required tags',
			'The resource(s) assigned to this event do not contain all of the required tags (' + tagString + ').',
			'OK',
			confirmCallback,
			cancelButtonText,
			cancelCallback
		);
	}
	else {
		confirmCallback();
	}


	// -----------------------------
	// Tag matching helper function
	// -----------------------------

	// Function to match tags and return matched tags as array. 
	// Allow parital match will returns tags that contain matching key word. 
	function getMatchingTags(matchTags, matchResources, allowPartialMatch) {
		var tagsResult = [];
		var matchingTags;
		var resources = seedcodeCalendar.get('resources');
		var matchingResources = dbk.objectArrayMatch(matchResources, resources, 'name');
		if (!matchingResources || !matchingResources.length) {
			return [];
		}
	
		for (var i = 0; i < matchingResources.length; i++) {
			matchingTags = dbk.objectArrayMatch(matchTags, matchingResources[i].tags, 'name', allowPartialMatch);
			if (!matchingTags || !matchingTags.length) {
				return [];
			}
			for (var ii = 0; ii < matchingTags.length; ii++) {
				tagsResult.push(matchingTags[ii]);
			}
		}
		return tagsResult;
	}

	//---------------------
	// End matching helper
	// --------------------
}


//----------- Run function wrapper and helpers - you shouldn’t need to edit below this line. -------------------

// Variables used for helper functions below
var timeout;

// Execute the run function as defined above
try {
    if (!options.restrictedToAccounts || 
        !options.restrictedToAccounts.length || 
        (options.restrictedToAccounts && options.restrictedToAccounts.indexOf(inputs.account) > -1)
    ) {
        if (action.preventDefault && options.runTimeout) {
            timeoutCheck();
        }
        run();
    }
    else if (action.preventDefault) {
        confirmCallback();
    }
}
catch(error) {
    reportError(error);
}

// Run confirm callback when preventDefault is true. Used for async actions
function confirmCallback() {
    cancelTimeoutCheck();
    if (action.callbacks.confirm) {
        action.callbacks.confirm();
    }
}

// Run cancel callback when preventDefault is true. Used for async actions
function cancelCallback() {
    cancelTimeoutCheck();
    if (action.callbacks.cancel) {
        action.callbacks.cancel();
    }
}

// Check if the action has run within the specified time limit when preventDefault is enabled
function timeoutCheck() {
    timeout = setTimeout(function() {
        var error = {
            name: 'Timeout',
            message: 'The action was unable to execute within the allotted time and has been stopped'
        };
        reportError(error, true);
    }, (options && options.runTimeout ? options.runTimeout * 1000 : 0));
}

function cancelTimeoutCheck() {
    if (timeout) {
        clearTimeout(timeout);
    }
}

// Function to report any errors that occur when running this action
// Follows standard javascript error reporter format of an object with name and message properties
function reportError(error) {
    var errorTitle = 'Error Running Custom Action';
    var errorMessage = '<p>There was a problem running the action "<span style="white-space: nowrap">' + action.name + '</span>"</p><p>Error: ' + error.message + '.</p><p>This may result in unexpected behavior of the calendar.</p>'
    if (action.preventDefault && timeout) {
        confirmCallback();
    }
    else {
        cancelCallback();  
    }
    
    setTimeout(function() {
        utilities.showModal(errorTitle, errorMessage, null, null, 'OK', null, null, null, true, null, true);
    }, 1000);
}
