(function(window) {

  window.extractData = function() {

    var ret = $.Deferred();

    function onError(error) {

      console.error("FHIR Error:", error);
      console.error("Arguments:", arguments);

      $('#loading').hide();

      $('#errors').html(
        '<pre>' +
        JSON.stringify(error, null, 2) +
        '</pre>'
      );

      ret.reject(error);
    }

    function onReady(smart) {

      console.log("SMART State:", smart);

      if (!smart.patient) {
        console.error("No patient context");
        onError("No patient context");
        return;
      }

      console.log("Patient ID:", smart.patient.id);

      var patient = smart.patient;

      console.log("Reading patient...");

      var pt = patient.read();

      pt.fail(function(err) {
        console.error("Patient read failed:", err);
      });

      console.log("Reading observations...");

      var obv = smart.patient.api.fetchAll({
        type: 'Observation',
        query: {
          code: {
            $or: [
              'http://loinc.org|8302-2',
              'http://loinc.org|8462-4',
              'http://loinc.org|8480-6',
              'http://loinc.org|2085-9',
              'http://loinc.org|2089-1',
              'http://loinc.org|55284-4'
            ]
          }
        }
      });

      obv.fail(function(err) {
        console.error("Observation read failed:", err);
      });

      $.when(pt, obv).fail(onError);

      $.when(pt, obv).done(function(patient, obv) {

        console.log("Patient loaded:", patient);
        console.log("Observations loaded:", obv);

        var byCodes = smart.byCodes(obv, 'code');

        var fname = '';
        var lname = '';

        if (
          patient.name &&
          patient.name.length > 0
        ) {

          if (patient.name[0].given) {
            fname = patient.name[0].given.join(' ');
          }

          if (patient.name[0].family) {

            if (Array.isArray(patient.name[0].family)) {
              lname = patient.name[0].family.join(' ');
            } else {
              lname = patient.name[0].family;
            }
          }
        }

        var height = byCodes('8302-2');

        var systolicbp =
          getBloodPressureValue(
            byCodes('55284-4'),
            '8480-6'
          );

        var diastolicbp =
          getBloodPressureValue(
            byCodes('55284-4'),
            '8462-4'
          );

        var hdl = byCodes('2085-9');
        var ldl = byCodes('2089-1');

        var p = defaultPatient();

        p.birthdate = patient.birthDate;
        p.gender = patient.gender;
        p.fname = fname;
        p.lname = lname;

        if (height && height.length > 0) {
          p.height = getQuantityValueAndUnit(height[0]);
        }

        if (typeof systolicbp !== 'undefined') {
          p.systolicbp = systolicbp;
        }

        if (typeof diastolicbp !== 'undefined') {
          p.diastolicbp = diastolicbp;
        }

        if (hdl && hdl.length > 0) {
          p.hdl = getQuantityValueAndUnit(hdl[0]);
        }

        if (ldl && ldl.length > 0) {
          p.ldl = getQuantityValueAndUnit(ldl[0]);
        }

        ret.resolve(p);

      });

    }

    FHIR.oauth2.ready(onReady, onError);

    return ret.promise();

  };

  function defaultPatient() {

    return {
      fname: '',
      lname: '',
      gender: '',
      birthdate: '',
      height: '',
      systolicbp: '',
      diastolicbp: '',
      ldl: '',
      hdl: ''
    };

  }

  function getBloodPressureValue(BPObservations, typeOfPressure) {

    if (!BPObservations) {
      return undefined;
    }

    var formattedBPObservations = [];

    BPObservations.forEach(function(observation) {

      if (!observation.component) {
        return;
      }

      var BP = observation.component.find(function(component) {

        return component.code.coding.find(function(coding) {

          return coding.code === typeOfPressure;

        });

      });

      if (BP) {

        observation.valueQuantity = BP.valueQuantity;

        formattedBPObservations.push(observation);

      }

    });

    return getQuantityValueAndUnit(formattedBPObservations[0]);

  }

  function getQuantityValueAndUnit(ob) {

    if (
      ob &&
      ob.valueQuantity &&
      ob.valueQuantity.value !== undefined &&
      ob.valueQuantity.unit !== undefined
    ) {

      return ob.valueQuantity.value + ' ' + ob.valueQuantity.unit;

    }

    return undefined;

  }

  window.drawVisualization = function(p) {

    $('#holder').show();
    $('#loading').hide();

    $('#fname').html(p.fname);
    $('#lname').html(p.lname);
    $('#gender').html(p.gender);
    $('#birthdate').html(p.birthdate);

    $('#height').html(p.height);
    $('#systolicbp').html(p.systolicbp);
    $('#diastolicbp').html(p.diastolicbp);

    $('#ldl').html(p.ldl);
    $('#hdl').html(p.hdl);

  };

})(window);
